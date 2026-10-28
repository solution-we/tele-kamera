import { describe, expect, it } from "vitest";

import {
  compareVersions,
  isPubliclyVisible,
  pickLatest,
  pickLatestStable,
  type ReleaseSummary,
} from "@/lib/release-selection";

function release(overrides: Partial<ReleaseSummary> & { id: string }): ReleaseSummary {
  return {
    platform: "android",
    version: "1.0.0",
    build_number: null,
    channel: "stable",
    status: "published",
    released_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("release publication rules", () => {
  it("resolves the latest published stable release by release date", () => {
    const latest = pickLatestStable([
      release({ id: "old", version: "0.5.0", released_at: "2026-01-01T00:00:00Z" }),
      release({ id: "newest", version: "1.2.0", released_at: "2026-03-01T00:00:00Z" }),
      release({ id: "mid", version: "1.0.0", released_at: "2026-02-01T00:00:00Z" }),
    ]);
    expect(latest?.id).toBe("newest");
  });

  it("never selects beta or pre-release builds as the stable download", () => {
    const latest = pickLatestStable([
      release({ id: "stable", version: "1.0.0", channel: "stable" }),
      release({ id: "beta-newer", version: "9.9.9", channel: "beta", released_at: "2026-06-01T00:00:00Z" }),
      release({ id: "pre", version: "9.9.8", channel: "pre_release", released_at: "2026-05-01T00:00:00Z" }),
    ]);
    expect(latest?.id).toBe("stable");
  });

  it("never selects draft, archived or unpublished releases", () => {
    const latest = pickLatestStable([
      release({ id: "draft", version: "2.0.0", status: "draft", released_at: "2026-06-01T00:00:00Z" }),
      release({ id: "archived", version: "1.9.0", status: "archived", released_at: "2026-05-01T00:00:00Z" }),
      release({ id: "live", version: "1.0.0", status: "published" }),
    ]);
    expect(latest?.id).toBe("live");
    expect(isPubliclyVisible({ status: "draft" })).toBe(false);
    expect(isPubliclyVisible({ status: "archived" })).toBe(false);
  });

  it("returns null when no stable release exists", () => {
    expect(pickLatestStable([release({ id: "b", channel: "beta" })])).toBeNull();
  });

  it("keeps Android and Windows latest downloads independent", () => {
    const releases = [
      release({ id: "android-latest", platform: "android", version: "0.5.0" }),
      release({ id: "windows-latest", platform: "windows", version: "0.3.0" }),
      release({ id: "android-beta", platform: "android", version: "9.0.0", channel: "beta" }),
    ];
    const android = pickLatest(releases, "stable", "published");
    expect(android?.platform).toBe("android");
    expect(releases.filter((r) => r.platform === "windows").every((r) => pickLatestStable([r])?.id === "windows-latest")).toBe(true);
  });

  it("falls back to creation time when release dates are missing", () => {
    const latest = pickLatestStable([
      release({ id: "older", version: "1.0.0", released_at: null, created_at: "2026-01-01T00:00:00Z" }),
      release({ id: "newer", version: "1.1.0", released_at: null, created_at: "2026-02-01T00:00:00Z" }),
    ]);
    expect(latest?.id).toBe("newer");
  });

  it("compares versions numerically per segment", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
    expect(compareVersions("0.9.0", "0.10.0")).toBeLessThan(0);
    expect(compareVersions("v2.0", "2.0.0")).toBeLessThan(0);
  });

  it("breaks release-date ties by version, not insertion order", () => {
    const latest = pickLatestStable([
      release({ id: "lower", version: "1.2.0", released_at: "2026-03-01T00:00:00Z" }),
      release({ id: "higher", version: "1.10.0", released_at: "2026-03-01T00:00:00Z" }),
    ]);
    expect(latest?.id).toBe("higher");
  });
});
