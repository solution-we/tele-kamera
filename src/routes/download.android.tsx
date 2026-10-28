import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { getLatestStableReleases } from "@/lib/releases.functions";
import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import { formatBytes, formatDate, formatVersion } from "@/components/site/format";

export const Route = createFileRoute("/download/android")({
  loader: () => getLatestStableReleases(),
  head: () => ({
    meta: [
      { title: "Download for Android — TeleKamera" },
      { name: "description", content: "Download the latest stable TeleKamera app for Android. Direct APK download." },
      { property: "og:title", content: "Download for Android — TeleKamera" },
      { property: "og:description", content: "Latest stable TeleKamera APK download." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PlatformDownload platform="android" />,
});

export function PlatformDownload({ platform }: { platform: "android" | "windows" }) {
  const latest = Route.useLoaderData() as Awaited<ReturnType<typeof getLatestStableReleases>>;
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
              <p className="mt-2 text-sm text-muted-foreground">Latest published stable release.</p>
              <p className="mt-6 font-display text-2xl font-semibold">{formatVersion(release.version)}</p>
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
                Download {release.original_filename.endsWith(".msi") ? "MSI" : release.original_filename.endsWith(".exe") ? "EXE" : "APK"}
              </a>
              <p className="mt-6 text-xs text-muted-foreground">
                <Link to="/downloads" className="underline-offset-4 hover:underline">Browse all releases →</Link>
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                No stable {label} release has been published yet.
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
