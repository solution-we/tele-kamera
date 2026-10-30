// Administrator and release-management server functions.
// Every function authenticates the caller (requireSupabaseAuth) and then
// verifies the admin role server-side; client checks are never trusted.
import { createServerFn } from "@tanstack/react-start";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  buildNumberSchema,
  channelSchema,
  checkMagicBytes,
  extensionAllowed,
  filenameSchema,
  isoDateSchema,
  MAX_RELEASE_BYTES as maxReleaseBytes,
  minOsVersionSchema,
  mimeByExtension,
  notesSchema,
  platformSchema,
  uploadKeySchema,
  versionSchema,
  type ReleasePlatform,
} from "@/lib/release-validation";
import { pickLatestStable, type ReleaseSummary } from "@/lib/release-selection";

type AdminContext = { supabase: SupabaseClient<Database>; userId: string };

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

async function requireAdmin(context: AdminContext): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  } as never);
  if (error || !data) throw new Error("Forbidden");
}

async function audit(
  context: AdminContext,
  action: string,
  target: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  await context.supabase.from("admin_audit_log").insert({
    actor: context.userId,
    action,
    target,
    details: details as unknown as Json,
  });
}

// ---- Server-side binary inspection (constant memory: streaming hash) ----

interface ObjectStats {
  size: number;
  sha256: string;
  head: Uint8Array;
  contentType: string | null;
}

async function serviceHeaders(): Promise<Record<string, string>> {
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!key) throw new Error("Service configuration missing");
  const headers: Record<string, string> = { apikey: key };
  if (key.split(".").length === 3) headers["Authorization"] = `Bearer ${key}`;
  return headers;
}

async function storageObjectUrl(storageKey: string): Promise<string> {
  const base = process.env["SUPABASE_URL"];
  if (!base) throw new Error("Service configuration missing");
  const encoded = storageKey.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/releases/${encoded}`;
}

async function streamObjectStats(storageKey: string): Promise<ObjectStats> {
  const response = await fetch(await storageObjectUrl(storageKey), {
    headers: await serviceHeaders(),
  });
  if (!response.ok || !response.body) {
    throw new Error("Uploaded file could not be found in storage. Please upload it again.");
  }
  const hash = createHash("sha256");
  const head = new Uint8Array(8);
  let headFilled = 0;
  let size = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    hash.update(value);
    size += value.byteLength;
    if (headFilled < head.length) {
      const take = Math.min(value.byteLength, head.length - headFilled);
      head.set(value.subarray(0, take), headFilled);
      headFilled += take;
    }
    if (size > maxReleaseBytes) {
      await reader.cancel();
      throw new Error("File exceeds the 1 GB size limit");
    }
  }
  return {
    size,
    sha256: hash.digest("hex"),
    head,
    contentType: response.headers.get("content-type"),
  };
}

async function deleteStorageObject(storageKey: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.storage.from("releases").remove([storageKey]);
}

async function moveStorageObject(fromKey: string, toKey: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.storage.from("releases").move(fromKey, toKey);
  if (error) throw new Error("Could not finalize the file in storage");
}

// ---- Admin session state ----

export const getAdminSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ email: string; isAdmin: boolean; mustChangePassword: boolean }> => {
    const ctx = context as unknown as AdminContext;
    let isAdmin = false;
    try {
      await requireAdmin(ctx);
      isAdmin = true;
    } catch {
      isAdmin = false;
    }
    let mustChangePassword = false;
    if (isAdmin) {
      const { data } = await ctx.supabase
        .from("admin_security")
        .select("must_change_password")
        .eq("user_id", ctx.userId)
        .maybeSingle();
      mustChangePassword = data?.must_change_password === true;
    }
    const { data: userData } = await ctx.supabase.auth.getUser();
    return { email: userData.user?.email ?? "", isAdmin, mustChangePassword };
  });

export const completePasswordChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Result> => {
    const ctx = context as unknown as AdminContext;
    try {
      await requireAdmin(ctx);
    } catch {
      return fail("Forbidden");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_security")
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq("user_id", ctx.userId);
    if (error) return fail("Could not update the security flag");
    await audit(ctx, "admin.password_changed", ctx.userId);
    return { ok: true };
  });

// ---- Release listing (admin) ----

export interface AdminRelease {
  id: string;
  platform: string;
  version: string;
  build_number: string | null;
  channel: string;
  status: string;
  release_notes: string;
  released_at: string | null;
  min_os_version: string | null;
  storage_key: string;
  original_filename: string;
  file_size: number | null;
  sha256: string | null;
  content_type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export const listAllReleases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as AdminContext;
    await requireAdmin(ctx);
    const { data, error } = await ctx.supabase
      .from("releases")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load releases");
    return (data ?? []) as AdminRelease[];
  });

export interface AdminOverview {
  counts: { draft: number; published: number; archived: number };
  latestAndroid: AdminRelease | null;
  latestWindows: AdminRelease | null;
  storageBytes: number;
  recentActivity: { id: string; actor: string | null; action: string; target: string | null; created_at: string }[];
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    const ctx = context as unknown as AdminContext;
    await requireAdmin(ctx);
    const { data: rows, error } = await ctx.supabase
      .from("releases")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load overview");
    const releases = (rows ?? []) as AdminRelease[];
    const counts = { draft: 0, published: 0, archived: 0 };
    for (const r of releases) {
      if (r.status in counts) counts[r.status as keyof typeof counts] += 1;
    }
    const toSummary = (r: AdminRelease): ReleaseSummary => ({
      id: r.id,
      platform: r.platform,
      version: r.version,
      build_number: r.build_number,
      channel: r.channel,
      status: r.status,
      released_at: r.released_at,
      created_at: r.created_at,
    });
    const latestAndroid = pickLatestStable(releases.filter((r) => r.platform === "android").map(toSummary));
    const latestWindows = pickLatestStable(releases.filter((r) => r.platform === "windows").map(toSummary));
    const { data: activity, error: activityError } = await ctx.supabase
      .from("admin_audit_log")
      .select("id, actor, action, target, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    return {
      counts,
      latestAndroid: latestAndroid ? (releases.find((r) => r.id === latestAndroid.id) ?? null) : null,
      latestWindows: latestWindows ? (releases.find((r) => r.id === latestWindows.id) ?? null) : null,
      storageBytes: releases.reduce((sum, r) => sum + (r.file_size ?? 0), 0),
      recentActivity: (activity ?? []) as AdminOverview["recentActivity"],
      ...(activityError ? {} : {}),
    };
  });

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as AdminContext;
    await requireAdmin(ctx);
    const { data, error } = await ctx.supabase
      .from("admin_audit_log")
      .select("id, actor, action, target, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Could not load audit log");
    return data ?? [];
  });

// ---- Release create / validate / replace ----

const registerSchema = z.object({
  platform: platformSchema,
  version: versionSchema,
  buildNumber: buildNumberSchema.optional(),
  channel: channelSchema,
  releaseNotes: notesSchema.optional().default(""),
  releasedAt: isoDateSchema.nullish(),
  minOsVersion: minOsVersionSchema.nullish(),
  storageKey: z.string(),
  originalFilename: z.string(),
});

/** Validated, server-computed stats for an uploaded file. */
async function inspectUpload(
  ctx: AdminContext,
  platform: ReleasePlatform,
  rawStorageKey: string,
  rawFilename: string,
): Promise<{ storageKey: string; filename: string; stats: ObjectStats; contentType: string } | { error: string }> {
  const storageKey = uploadKeySchema(ctx.userId).parse(rawStorageKey);
  const parsedFilename = filenameSchema.parse(rawFilename);
  if (!extensionAllowed(platform, parsedFilename)) {
    return {
      error: `Only ${platform === "android" ? ".apk or .zip" : ".exe, .msi or .zip"} files are accepted for ${platform}`,
    };
  }
  let stats: ObjectStats;
  try {
    stats = await streamObjectStats(storageKey);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not read the uploaded file" };
  }
  if (stats.size === 0) return { error: "The uploaded file is empty" };
  if (!checkMagicBytes(platform, parsedFilename, stats.head)) {
    await deleteStorageObject(storageKey);
    return { error: "The file does not look like a genuine installer for this platform" };
  }
  const contentType = mimeByExtension[parsedFilename.toLowerCase().slice(parsedFilename.lastIndexOf("."))] ?? "application/octet-stream";
  return { storageKey, filename: parsedFilename, stats, contentType };
}

export const registerRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => registerSchema.parse(input))
  .handler(async ({ data, context }): Promise<Result<{ releaseId: string }>> => {
    const ctx = context as unknown as AdminContext;
    try {
      await requireAdmin(ctx);
    } catch {
      return fail("Forbidden");
    }
    const inspected = await inspectUpload(ctx, data.platform, data.storageKey, data.originalFilename);
    if ("error" in inspected) return fail(inspected.error);
    const { storageKey, filename, stats, contentType } = inspected;

    const { data: row, error: insertError } = await ctx.supabase
      .from("releases")
      .insert({
        platform: data.platform,
        version: data.version,
        build_number: data.buildNumber ?? null,
        channel: data.channel,
        status: "draft",
        release_notes: data.releaseNotes ?? "",
        released_at: data.releasedAt ?? new Date().toISOString(),
        min_os_version: data.minOsVersion ?? null,
        storage_key: storageKey,
        original_filename: filename,
        file_size: stats.size,
        sha256: stats.sha256,
        content_type: contentType,
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (insertError || !row) {
      await deleteStorageObject(storageKey);
      return fail("Could not save the release");
    }

    const canonicalKey = `releases/${row.id}/${Date.now()}-${filename}`;
    try {
      await moveStorageObject(storageKey, canonicalKey);
    } catch (err) {
      await ctx.supabase.from("releases").delete().eq("id", row.id);
      await deleteStorageObject(storageKey);
      return fail(err instanceof Error ? err.message : "Could not finalize the file in storage");
    }
    const { error: updateError } = await ctx.supabase
      .from("releases")
      .update({ storage_key: canonicalKey })
      .eq("id", row.id);
    if (updateError) return fail("Could not finalize the release record");

    await audit(ctx, "release.created", row.id, {
      platform: data.platform,
      version: data.version,
      channel: data.channel,
      size: stats.size,
    });
    return { ok: true, data: { releaseId: row.id } };
  });

const replaceSchema = z.object({
  releaseId: z.string().uuid(),
  storageKey: z.string(),
  originalFilename: z.string(),
});

export const replaceReleaseBinary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => replaceSchema.parse(input))
  .handler(async ({ data, context }): Promise<Result> => {
    const ctx = context as unknown as AdminContext;
    try {
      await requireAdmin(ctx);
    } catch {
      return fail("Forbidden");
    }
    const { data: release } = await ctx.supabase
      .from("releases")
      .select("id, platform, storage_key")
      .eq("id", data.releaseId)
      .maybeSingle();
    if (!release) return fail("Release not found");
    const inspected = await inspectUpload(
      ctx,
      release.platform as ReleasePlatform,
      data.storageKey,
      data.originalFilename,
    );
    if ("error" in inspected) return fail(inspected.error);
    const { storageKey, filename, stats, contentType } = inspected;

    const canonicalKey = `releases/${release.id}/${Date.now()}-${filename}`;
    try {
      await moveStorageObject(storageKey, canonicalKey);
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Could not finalize the file in storage");
    }
    const oldKey = release.storage_key as string;
    const { error: updateError } = await ctx.supabase
      .from("releases")
      .update({
        storage_key: canonicalKey,
        original_filename: filename,
        file_size: stats.size,
        sha256: stats.sha256,
        content_type: contentType,
      })
      .eq("id", release.id);
    if (updateError) {
      await moveStorageObject(canonicalKey, storageKey);
      return fail("Could not update the release");
    }
    await deleteStorageObject(oldKey);
    await audit(ctx, "release.binary_replaced", release.id, { size: stats.size });
    return { ok: true };
  });

// ---- Status transitions ----

const statusSchema = z.object({
  releaseId: z.string().uuid(),
  action: z.enum(["publish", "unpublish", "archive"]),
});

export const setReleaseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data, context }): Promise<Result> => {
    const ctx = context as unknown as AdminContext;
    try {
      await requireAdmin(ctx);
    } catch {
      return fail("Forbidden");
    }
    const { data: release } = await ctx.supabase
      .from("releases")
      .select("id, status, released_at")
      .eq("id", data.releaseId)
      .maybeSingle();
    if (!release) return fail("Release not found");

    type ReleasePatch = Partial<Database["public"]["Tables"]["releases"]["Update"]>;
    const patch: ReleasePatch = {};
    if (data.action === "publish") {
      if (release.status === "published") return fail("Release is already published");
      patch.status = "published";
      patch.published_at = new Date().toISOString();
      if (!release.released_at) patch.released_at = new Date().toISOString();
    } else if (data.action === "unpublish") {
      patch.status = "draft";
      patch.published_at = null;
    } else {
      patch.status = "archived";
    }
    const { error } = await ctx.supabase.from("releases").update(patch).eq("id", data.releaseId);
    if (error) return fail("Could not update the release status");
    await audit(ctx, `release.${data.action}ed`, data.releaseId);
    return { ok: true };
  });

// ---- Edit / delete ----

const editSchema = z.object({
  releaseId: z.string().uuid(),
  version: versionSchema,
  buildNumber: buildNumberSchema.nullish(),
  channel: channelSchema,
  releaseNotes: notesSchema,
  releasedAt: isoDateSchema.nullish(),
  minOsVersion: minOsVersionSchema.nullish(),
});

export const updateRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => editSchema.parse(input))
  .handler(async ({ data, context }): Promise<Result> => {
    const ctx = context as unknown as AdminContext;
    try {
      await requireAdmin(ctx);
    } catch {
      return fail("Forbidden");
    }
    const { error } = await ctx.supabase
      .from("releases")
      .update({
        version: data.version,
        build_number: data.buildNumber ?? null,
        channel: data.channel,
        release_notes: data.releaseNotes,
        released_at: data.releasedAt ?? null,
        min_os_version: data.minOsVersion ?? null,
      })
      .eq("id", data.releaseId);
    if (error) return fail("Could not update the release");
    await audit(ctx, "release.edited", data.releaseId, { version: data.version });
    return { ok: true };
  });

export const deleteRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ releaseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<Result> => {
    const ctx = context as unknown as AdminContext;
    try {
      await requireAdmin(ctx);
    } catch {
      return fail("Forbidden");
    }
    const { data: release } = await ctx.supabase
      .from("releases")
      .select("id, storage_key")
      .eq("id", data.releaseId)
      .maybeSingle();
    if (!release) return fail("Release not found");
    const { error } = await ctx.supabase.from("releases").delete().eq("id", data.releaseId);
    if (error) return fail("Could not delete the release");
    await deleteStorageObject(release.storage_key as string);
    await audit(ctx, "release.deleted", data.releaseId);
    return { ok: true };
  });

// ---- One-time administrator bootstrap (public, self-disabling) ----

export const runBootstrap = createServerFn({ method: "POST" }).handler(async (): Promise<Result> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: state } = await supabaseAdmin.from("bootstrap_state").select("completed_at").maybeSingle();
  if (state?.completed_at) return fail("Setup has already been completed");

  const email = process.env["ADMIN_INITIAL_EMAIL"];
  const password = process.env["ADMIN_INITIAL_PASSWORD"];
  if (!email || !password) return fail("Setup credentials are not configured on the server");

  let userId: string | null = null;
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created?.user) {
    userId = created.user.id;
  } else if (createError) {
    // The account may already exist (e.g. a retry). Resolve it by email.
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    userId = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
    if (!userId) return fail("Could not create the administrator account");
  }
  if (!userId) return fail("Could not create the administrator account");

  await supabaseAdmin.from("user_roles").upsert(
    { user_id: userId, role: "admin" },
    { onConflict: "user_id,role" },
  );
  await supabaseAdmin.from("admin_security").upsert(
    { user_id: userId, must_change_password: true },
    { onConflict: "user_id" },
  );
  await supabaseAdmin
    .from("bootstrap_state")
    .upsert({ id: true, completed_at: new Date().toISOString(), admin_user_id: userId }, { onConflict: "id" });
  await supabaseAdmin.from("admin_audit_log").insert({
    actor: userId,
    action: "admin.bootstrap_completed",
    target: userId,
    details: {},
  });

  return { ok: true };
});
