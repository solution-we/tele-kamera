import { createFileRoute, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";

import { getAdminOverview } from "@/lib/admin.functions";
import { formatBytes, formatDate, formatDateTime, formatVersion } from "@/components/site/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  ssr: false,
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: useServerFn(getAdminOverview),
  });
  const data = overview.data;

  if (overview.isLoading) return <p className="text-sm text-muted-foreground">Loading overview…</p>;
  if (overview.isError || !data) return <p className="text-sm text-destructive">Could not load the overview.</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Release status and recent administrative activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LatestCard title="Latest Android release" release={data.latestAndroid} />
        <LatestCard title="Latest Windows release" release={data.latestWindows} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Draft" value={data.counts.draft} />
        <Stat label="Published" value={data.counts.published} />
        <Stat label="Archived" value={data.counts.archived} />
        <Stat label="Storage used" value={formatBytes(data.storageBytes)} />
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-display text-base font-semibold">Recent activity</h2>
        {data.recentActivity.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No administrative activity yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {data.recentActivity.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="text-foreground">{entry.action}</span>
                <span className="truncate text-xs text-muted-foreground">{entry.target ? entry.target.slice(0, 8) : ""}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link to="/admin/releases" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
        Manage releases →
      </Link>
    </div>
  );
}

function LatestCard({ title, release }: { title: string; release: { version: string; channel: string; released_at: string | null; file_size: number | null } | null }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {release ? (
        <div className="mt-3">
          <p className="font-display text-2xl font-semibold">{formatVersion(release.version)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {release.channel === "stable" ? "Stable" : release.channel === "beta" ? "Beta" : "Pre-release"} · {formatDate(release.released_at)} · {formatBytes(release.file_size)}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No stable release published yet.</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
