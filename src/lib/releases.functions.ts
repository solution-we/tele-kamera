// Public read-only release functions. Every query goes through the
// Public read-only release functions. Every query goes through the
// publishable client, so the database's public SELECT policy (published
// rows only) is the single source of truth for what leaves the server.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getPublicSupabase } from "@/lib/supabase-public.server";
import { pickLatestPublished, type ReleaseSummary } from "@/lib/release-selection";
import { platformSchema } from "@/lib/release-validation";

export interface PublicRelease {
  id: string;
  platform: string;
  version: string;
  build_number: string | null;
  channel: string;
  status: string;
  release_notes: string;
  released_at: string | null;
  min_os_version: string | null;
  file_size: number | null;
  sha256: string | null;
  original_filename: string;
}

const publicColumns =
  "id, platform, version, build_number, channel, status, release_notes, released_at, min_os_version, file_size, sha256, original_filename";

export const listPublicReleases = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from("releases")
    .select(publicColumns)
    .order("released_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Could not load releases");
  return (data ?? []) as PublicRelease[];
});

export interface LatestReleases {
  android: PublicRelease | null;
  windows: PublicRelease | null;
}

/**
 * The latest published release for each platform, regardless of channel.
 * A freshly published Beta or Pre-release shows up immediately, with its
 * channel carried in the row so pages can label it.
 */
export const getLatestPublishedReleases = createServerFn({ method: "GET" }).handler(
  async (): Promise<LatestReleases> => {
    const supabase = getPublicSupabase();
    const { data, error } = await supabase
      .from("releases")
      .select(publicColumns)
      .order("released_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Could not load releases");
    const rows = (data ?? []) as PublicRelease[];
    const toSummary = (r: PublicRelease): ReleaseSummary => ({
      id: r.id,
      platform: r.platform,
      version: r.version,
      build_number: r.build_number,
      channel: r.channel,
      status: r.status,
      released_at: r.released_at,
      created_at: "",
    });
    const android = rows.filter((r) => r.platform === "android");
    const windows = rows.filter((r) => r.platform === "windows");
    const latestAndroid = pickLatestPublished(android.map(toSummary));
    const latestWindows = pickLatestPublished(windows.map(toSummary));
    return {
      android: latestAndroid ? (android.find((r) => r.id === latestAndroid.id) ?? null) : null,
      windows: latestWindows ? (windows.find((r) => r.id === latestWindows.id) ?? null) : null,
    };
  },
);

export const getPublishedRelease = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ platform: platformSchema, id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    const { data: row, error } = await supabase
      .from("releases")
      .select(publicColumns)
      .eq("id", data.id)
      .eq("platform", data.platform)
      .maybeSingle();
    if (error || !row) return null;
    return row as PublicRelease;
  });
