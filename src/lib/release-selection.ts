// Pure release-selection rules shared by the public site, the admin
// dashboard and the test suite. Keep this file free of I/O and imports.

export type ReleaseChannel = "stable" | "beta" | "pre_release";
export type ReleaseStatus = "draft" | "published" | "archived";
export type ReleasePlatform = "android" | "windows";

export interface ReleaseSummary {
  id: string;
  platform: string;
  version: string;
  build_number: string | null;
  channel: string;
  status: string;
  released_at: string | null;
  created_at: string;
}

/**
 * The latest published Stable release for one platform.
 * Ordered by release date (falling back to creation time), then by
 * descending version. Beta and pre-release builds never qualify.
 */
export function pickLatestStable<T extends ReleaseSummary>(releases: T[]): T | null {
  return pickLatest(releases, "stable", "published");
}

export function pickLatest<T extends ReleaseSummary>(
  releases: T[],
  channel: ReleaseChannel,
  status: ReleaseStatus,
): T | null {
  const candidates = releases.filter((r) => r.channel === channel && r.status === status);
  if (candidates.length === 0) return null;
  return candidates.sort(compareReleases)[0] ?? null;
}

/**
 * The latest published release for one platform, whatever its channel
 * (Stable, Beta or Pre-release). The public pages surface this, so a
 * freshly uploaded and published build is never hidden just because it
 * was tagged as a beta.
 */
export function pickLatestPublished<T extends ReleaseSummary>(releases: T[]): T | null {
  return releases.filter((r) => r.status === "published").sort(compareReleases)[0] ?? null;
}

export function compareReleases(a: ReleaseSummary, b: ReleaseSummary): number {
  const at = a.released_at ?? a.created_at;
  const bt = b.released_at ?? b.created_at;
  if (at !== bt) return at > bt ? -1 : 1;
  const byVersion = compareVersions(b.version, a.version);
  if (byVersion !== 0) return byVersion;
  return a.created_at > b.created_at ? -1 : 1;
}

/** Descending version order; numeric-aware segment comparison. */
export function compareVersions(a: string, b: string): number {
  const pa = a.toLowerCase().replace(/^v/, "").split(/[.+\-_]/);
  const pb = b.toLowerCase().replace(/^v/, "").split(/[.+\-_]/);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = Number.parseInt(pa[i] ?? "0", 10);
    const nb = Number.parseInt(pb[i] ?? "0", 10);
    const isNumA = Number.isFinite(na);
    const isNumB = Number.isFinite(nb);
    if (isNumA && isNumB) {
      if (na !== nb) return na - nb;
    } else if (!isNumA && !isNumB) {
      if ((pa[i] ?? "") !== (pb[i] ?? "")) return (pa[i] ?? "") > (pb[i] ?? "") ? 1 : -1;
    } else {
      return isNumA ? 1 : -1; // numeric segments outrank textual ones
    }
  }
  // Numerically equal (e.g. "2.0" vs "2.0.0"): the version with more
  // segments sorts later, so latest-version selection prefers it.
  return pa.length - pb.length;
}

/** Only published releases may ever appear in public listings. */
export function isPubliclyVisible(release: Pick<ReleaseSummary, "status">): boolean {
  return release.status === "published";
}
