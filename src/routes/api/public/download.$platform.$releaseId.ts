// Public binary download endpoint: /api/public/download/<platform>/<releaseId>
// Streams the real installer from private storage. Only *published* releases
// are ever resolvable here (enforced by the database's public SELECT policy),
// so drafts and unpublished releases cannot be downloaded.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { getPublicSupabase } from "@/lib/supabase-public.server";
import { mimeByExtension, platformSchema } from "@/lib/release-validation";

const paramsSchema = z.object({
  platform: platformSchema,
  releaseId: z.string().uuid(),
});

// Simple per-isolate rate limit: generous for humans, rude for scrapers.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export const Route = createFileRoute("/api/public/download/$platform/$releaseId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const parsed = paramsSchema.safeParse(params);
        if (!parsed.success) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("cf-connecting-ip") ||
          "unknown";
        if (rateLimited(ip)) {
          return Response.json({ error: "Too many requests" }, { status: 429 });
        }

        const supabase = getPublicSupabase();
        const { data: release, error } = await supabase
          .from("releases")
          .select("id, storage_key, original_filename, file_size, sha256, content_type")
          .eq("id", parsed.data.releaseId)
          .eq("platform", parsed.data.platform)
          .eq("status", "published")
          .maybeSingle();
        if (error || !release || !release.file_size) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }

        const storageBase = process.env["SUPABASE_URL"];
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!storageBase || !serviceKey) {
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }
        const headers: Record<string, string> = { apikey: serviceKey };
        if (serviceKey.split(".").length === 3) headers["Authorization"] = `Bearer ${serviceKey}`;
        const upstream = await fetch(
          `${storageBase}/storage/v1/object/releases/${(release.storage_key as string).split("/").map(encodeURIComponent).join("/")}`,
          { headers },
        );
        if (!upstream.ok || !upstream.body) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }

        const filename = release.original_filename.replace(/[^\w.\-+ ]+/g, "_");
        const ext = release.original_filename.slice(release.original_filename.lastIndexOf(".")).toLowerCase();
        const contentType = release.content_type ?? mimeByExtension[ext] ?? "application/octet-stream";
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": contentType,
            "content-length": String(release.file_size),
            "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(release.original_filename)}`,
            "x-sha256": release.sha256 ?? "",
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
          },
        });
      },
      HEAD: async ({ params }) => {
        const parsed = paramsSchema.safeParse(params);
        if (!parsed.success) return new Response(null, { status: 404 });
        const supabase = getPublicSupabase();
        const { data: release } = await supabase
          .from("releases")
          .select("id, file_size, content_type")
          .eq("id", parsed.data.releaseId)
          .eq("platform", parsed.data.platform)
          .eq("status", "published")
          .maybeSingle();
        if (!release || !release.file_size) return new Response(null, { status: 404 });
        return new Response(null, {
          status: 200,
          headers: {
            "content-length": String(release.file_size),
            "content-type": release.content_type ?? "application/octet-stream",
          },
        });
      },
    },
  },
});
