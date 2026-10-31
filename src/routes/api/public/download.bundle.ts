// Public combined download: /api/public/download/bundle
// Streams a single ZIP archive containing the latest published release for
// each platform, built on the fly from private storage without loading the
// whole archive into memory. Only published releases are resolvable here
// (enforced by the database's public SELECT policy).
import { createFileRoute } from "@tanstack/react-router";
import { Zip, ZipPassThrough } from "fflate";

import { getPublicSupabase } from "@/lib/supabase-public.server";
import { pickLatestPublished, type ReleaseSummary } from "@/lib/release-selection";

// Bundles are heavier than single downloads, so the limit is tighter.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
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

interface BundleRelease {
  platform: string;
  version: string;
  status: string;
  released_at: string | null;
  storage_key: string;
  original_filename: string;
  file_size: number;
  sha256: string | null;
}

function platformLabel(platform: string): string {
  return platform === "android" ? "Android" : "Windows";
}

function zipEntryName(release: BundleRelease): string {
  const ext = release.original_filename.slice(release.original_filename.lastIndexOf(".")).toLowerCase() || ".bin";
  const cleanVersion = release.version.replace(/[^\w.\-]+/g, "_");
  return `TeleKamera-${cleanVersion}-${release.platform}${ext}`;
}

async function serviceHeaders(): Promise<Record<string, string>> {
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!key) throw new Error("Server configuration error");
  const headers: Record<string, string> = { apikey: key };
  if (key.split(".").length === 3) headers["Authorization"] = `Bearer ${key}`;
  return headers;
}

interface ZipSource {
  name: string;
  url: string;
  headers: Record<string, string>;
}

/**
 * Builds a STORE-mode zip (the files are already compressed) as a stream:
 * entries are piped from storage into the zip as they download, and the zip
 * output flows to the client as it is produced. Memory stays bounded no
 * matter how large the installers are.
 */
function createZipStream(sources: ZipSource[], readme: string): ReadableStream<Uint8Array> {
  const queue: Uint8Array[] = [];
  let finished = false;
  let failure: unknown = null;
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let drained: (() => void) | null = null;
  let aborted = false;
  let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  const flush = () => {
    while (controller && queue.length && (controller.desiredSize ?? 0) !== 0) {
      controller.enqueue(queue.shift()!);
    }
    if (drained && queue.length <= 16) {
      const resolve = drained;
      drained = null;
      resolve();
    }
    if (controller && finished && queue.length === 0) {
      const c = controller;
      controller = null;
      if (failure !== null) c.error(failure);
      else c.close();
    }
  };

  const zip = new Zip((err: unknown | null, data: Uint8Array | undefined, final: boolean) => {
    if (err) {
      failure = err;
      finished = true;
    } else {
      if (data && data.length) queue.push(data);
      if (final) finished = true;
    }
    flush();
  });

  const pump = async () => {
    try {
      for (const source of sources) {
        if (aborted) return;
        const entry = new ZipPassThrough(source.name);
        zip.add(entry);
        const upstream = await fetch(source.url, { headers: source.headers });
        if (!upstream.ok || !upstream.body) {
          throw new Error("A release file could not be read from storage");
        }
        const reader = upstream.body.getReader();
        activeReader = reader;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (aborted) {
            await reader.cancel();
            return;
          }
          if (value && value.length) {
            entry.push(value, false);
            if (queue.length > 16) {
              await new Promise<void>((resolve) => {
                drained = resolve;
              });
            }
          }
        }
        entry.push(new Uint8Array(0), true);
      }
      const note = new ZipPassThrough("About these files.txt");
      zip.add(note);
      note.push(new TextEncoder().encode(readme), false);
      note.push(new Uint8Array(0), true);
      zip.end();
    } catch (err) {
      failure = err;
      finished = true;
      flush();
    }
  };
  void pump();

  return new ReadableStream<Uint8Array>({
    pull(c) {
      controller = c;
      flush();
    },
    cancel() {
      aborted = true;
      void activeReader?.cancel();
    },
  });
}

export const Route = createFileRoute("/api/public/download/bundle")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("cf-connecting-ip") ||
          "unknown";
        if (rateLimited(ip)) {
          return Response.json({ error: "Too many requests" }, { status: 429 });
        }

        const supabase = getPublicSupabase();
        const { data, error } = await supabase
          .from("releases")
          .select("id, platform, version, status, released_at, storage_key, original_filename, file_size, sha256")
          .eq("status", "published")
          .limit(200);
        if (error) {
          return Response.json({ error: "Could not load releases" }, { status: 500 });
        }
        const rows = (data ?? []) as (BundleRelease & { id: string })[];
        const toSummary = (r: BundleRelease): ReleaseSummary => ({
          id: "",
          platform: r.platform,
          version: r.version,
          build_number: null,
          channel: "stable",
          status: r.status,
          released_at: r.released_at,
          created_at: "",
        });
        const picks: BundleRelease[] = [];
        for (const platform of ["android", "windows"] as const) {
          const pool = rows.filter((r) => r.platform === platform && r.file_size);
          const latest = pickLatestPublished(pool.map(toSummary));
          if (latest) {
            const match = pool.find((r) => r.version === latest.version && r.released_at === latest.released_at);
            if (match) picks.push(match);
          }
        }
        if (picks.length === 0) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }

        let headers: Record<string, string>;
        let storageBase: string;
        try {
          headers = await serviceHeaders();
          storageBase = process.env["SUPABASE_URL"] ?? "";
        } catch {
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }
        if (!storageBase) {
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        const sources: ZipSource[] = picks.map((r) => ({
          name: zipEntryName(r),
          url: `${storageBase}/storage/v1/object/releases/${r.storage_key.split("/").map(encodeURIComponent).join("/")}`,
          headers,
        }));
        const readme = [
          "TeleKamera — latest releases bundled in one archive",
          "",
          ...picks.map(
            (r) =>
              `${platformLabel(r.platform)} ${r.version}` +
              (r.released_at ? ` (released ${r.released_at.slice(0, 10)})` : "") +
              ` — ${r.original_filename}, ${(r.file_size / 1024 ** 2).toFixed(1)} MB` +
              (r.sha256 ? `\n  SHA-256: ${r.sha256}` : ""),
          ),
          "",
          "Downloaded from telekamera.lovable.app. Install the Android app on your phone and the Windows app on your PC.",
        ].join("\n");

        return new Response(createZipStream(sources, readme), {
          status: 200,
          headers: {
            "content-type": "application/zip",
            "content-disposition": 'attachment; filename="TeleKamera-latest-all-platforms.zip"',
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
