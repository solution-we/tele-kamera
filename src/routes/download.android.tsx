import { createFileRoute, Link } from "@tanstack/react-router";

import { getLatestPublishedReleases, type LatestReleases } from "@/lib/releases.functions";
import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import { formatBytes, formatDate, formatVersion } from "@/components/site/format";

export const Route = createFileRoute("/download/android")({
  loader: () => getLatestPublishedReleases(),
  head: () => ({
    meta: [
      { title: "Download for Android — TeleKamera" },
      { name: "description", content: "Download the latest TeleKamera app for Android. Direct APK download." },
      { property: "og:title", content: "Download for Android — TeleKamera" },
      { property: "og:description", content: "Latest TeleKamera APK download." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: function AndroidDownload() {
    const latest = Route.useLoaderData() as LatestReleases;
    return <PlatformDownload platform="android" latest={latest} />;
  },
});

export function PlatformDownload({ platform, latest }: { platform: "android" | "windows"; latest: LatestReleases }) {
  const release = platform === "android" ? latest.android : latest.windows;
  const label = platform === "android" ? "Android" : "Windows";

  return (
    <div className="obsidian-sheen flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="glass w-full rounded-2xl p-8 text-center">
          <h1 className="font-display text-3xl font-bold">Download for {label}</h1>
          {release ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">Latest published release.</p>
              <p className="mt-6 font-display text-2xl font-semibold">
                {formatVersion(release.version)}
                {release.channel !== "stable" && (
                  <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-accent-foreground">
                    {release.channel === "beta" ? "Beta" : "Pre-release"}
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(release.released_at)} · {formatBytes(release.file_size)}
              </p>
              {release.sha256 && (
                <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground/80">SHA-256: {release.sha256}</p>
              )}
              <a
                href={`/download/${platform}/${release.id}`}
                className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Download {fileKind(release.original_filename)}
              </a>
              <p className="mt-6 text-xs text-muted-foreground">
                <Link to="/downloads" className="underline-offset-4 hover:underline">Browse all releases →</Link>
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                No {label} release has been published yet.
              </p>
              <span className="mt-6 inline-block rounded-lg border border-border px-6 py-3 text-sm text-muted-foreground" aria-disabled>
                Coming soon
              </span>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function fileKind(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (ext === ".msi") return "MSI";
  if (ext === ".exe") return "EXE";
  if (ext === ".zip") return "ZIP";
  return "APK";
}
