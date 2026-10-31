import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { listPublicReleases, type PublicRelease } from "@/lib/releases.functions";
import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import { formatBytes, formatDate, formatVersion } from "@/components/site/format";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads — TeleKamera" },
      { name: "description", content: "All published TeleKamera releases for Android and Windows, with sizes and SHA-256 checksums." },
      { property: "og:title", content: "Downloads — TeleKamera" },
      { property: "og:description", content: "All published TeleKamera releases for Android and Windows." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const releases = useQuery({ queryKey: ["public-releases"], queryFn: useServerFn(listPublicReleases) });
  const rows = releases.data ?? [];
  const android = rows.filter((r) => r.platform === "android");
  const windows = rows.filter((r) => r.platform === "windows");

  return (
    <div className="obsidian-sheen min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl font-bold">Downloads</h1>
        <p className="mt-3 text-muted-foreground">
          Every published TeleKamera release. Files are served directly by this site — never through third-party file sharing.
        </p>

        {rows.length > 0 && (
          <div className="glass mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl p-5">
            <a
              href="/api/public/download/bundle"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              📦 Download both platforms (ZIP)
            </a>
            <p className="text-xs text-muted-foreground">
              Bundles the latest Android and Windows releases into a single archive.
            </p>
          </div>
        )}

        {releases.isLoading && <p className="mt-10 text-sm text-muted-foreground">Loading releases…</p>}
        {releases.isError && <p className="mt-10 text-sm text-destructive">Could not load releases. Please try again later.</p>}
        {!releases.isLoading && rows.length === 0 && (
          <p className="mt-10 glass rounded-2xl p-6 text-sm text-muted-foreground">
            No releases have been published yet. Check back soon.
          </p>
        )}

        {android.length > 0 && <ReleaseGroup title="Android" rows={android} />}
        {windows.length > 0 && <ReleaseGroup title="Windows" rows={windows} />}
      </main>
      <SiteFooter />
    </div>
  );
}

function ReleaseGroup({ title, rows }: { title: string; rows: PublicRelease[] }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold">{formatVersion(r.version)}</span>
                  <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
                    {r.channel === "stable" ? "Stable" : r.channel === "beta" ? "Beta" : "Pre-release"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(r.released_at)} · {formatBytes(r.file_size)}
                  {r.min_os_version ? ` · Requires ${r.platform === "android" ? "Android" : "Windows"} ${r.min_os_version}+` : ""}
                </p>
                {r.sha256 && <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">SHA-256: {r.sha256}</p>}
                {r.release_notes && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{r.release_notes}</p>}
              </div>
              <a
                href={`/download/${r.platform}/${r.id}`}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
