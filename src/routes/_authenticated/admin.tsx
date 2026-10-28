import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { completePasswordChange, getAdminSession } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/site/wordmark";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  loader: () => getAdminSession(),
  component: AdminLayout,
});

function AdminLayout() {
  const session = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.invalidate();
    await navigate({ to: "/auth", replace: true });
  }

  if (!session.isAdmin) {
    return (
      <div className="obsidian-sheen flex min-h-screen items-center justify-center px-4">
        <div className="glass max-w-md rounded-2xl p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Access restricted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is only available to the TeleKamera administrator.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={signOut} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Sign out
            </button>
            <a href="/" className="rounded-lg border border-input px-4 py-2 text-sm text-foreground hover:bg-accent">
              Back to site
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (session.mustChangePassword) {
    return <ForcePasswordChange email={session.email} onDone={() => router.invalidate()} />;
  }

  return (
    <div className="obsidian-sheen min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link to="/admin" className="flex items-center gap-2">
              <Wordmark className="text-lg" />
              <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm sm:flex">
              <Link
                to="/admin"
                activeProps={{ className: "bg-accent text-foreground" }}
                className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              >
                Overview
              </Link>
              <Link
                to="/admin/releases"
                activeProps={{ className: "bg-accent text-foreground" }}
                className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              >
                Releases
              </Link>
              <Link
                to="/admin/audit"
                activeProps={{ className: "bg-accent text-foreground" }}
                className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              >
                Audit log
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">{session.email}</span>
            <button
              onClick={signOut}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}

function ForcePasswordChange({ email, onDone }: { email: string; onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (next.length < 10) {
      setError("The new password must be at least 10 characters long.");
      return;
    }
    if (next !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    if (next === current) {
      setError("The new password must be different from the current one.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: next, current_password: current });
    if (updateError) {
      setBusy(false);
      setError("Could not change the password. Check the current password and try again.");
      return;
    }
    const result = await completePasswordChange();
    setBusy(false);
    if (!result.ok) {
      setError("The password was changed but the setup flag could not be cleared. Try again.");
      return;
    }
    onDone();
  }

  return (
    <div className="obsidian-sheen flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Wordmark className="text-2xl" />
          <p className="text-sm text-muted-foreground">Signed in as {email}</p>
        </div>
        <form onSubmit={submit} className="glass rounded-2xl p-6">
          <h1 className="font-display text-lg font-semibold">Set a new password</h1>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            For security, the initial setup password must be changed before you can use the dashboard.
          </p>
          <label htmlFor="cur" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Current password</label>
          <input id="cur" type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)}
            className="mb-4 w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <label htmlFor="new" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">New password (min. 10 characters)</label>
          <input id="new" type="password" required minLength={10} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)}
            className="mb-4 w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <label htmlFor="conf" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Confirm new password</label>
          <input id="conf" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="mb-4 w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          {error && <p className="mb-3 text-sm text-destructive" role="alert">{error}</p>}
          <button type="submit" disabled={busy}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
