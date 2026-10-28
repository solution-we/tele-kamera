import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listAuditLog } from "@/lib/admin.functions";
import { formatDateTime } from "@/components/site/format";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  ssr: false,
  component: AuditPage,
});

function AuditPage() {
  const audit = useQuery({ queryKey: ["admin-audit"], queryFn: useServerFn(listAuditLog) });
  const entries = audit.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">Security-relevant administrative actions. Secrets are never recorded.</p>
      </div>
      <div className="glass overflow-hidden rounded-2xl">
        {audit.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : !entries || entries.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Target</th>
                <th className="px-6 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-6 py-3 text-foreground">{entry.action}</td>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{entry.target ? entry.target.slice(0, 8) : "—"}</td>
                  <td className="px-6 py-3 text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
