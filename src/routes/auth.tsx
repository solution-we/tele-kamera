import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { runBootstrap } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/site/wordmark";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Administrator sign in — TeleKamera" },
      { name: "description", content: "TeleKamera administrator sign-in." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const bootstrap = useServerFn(runBootstrap);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [setupState, setSetupState] = useState<"idle" | "busy" | "done" | "unavailable">("idle");

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError("Invalid email or password.");
      return;
    }
    await router.invalidate();
    await router.navigate({ to: "/admin" });
  }

  async function handleSetup() {
    setSetupState("busy");
    const result = await bootstrap();
    if (result.ok) {
      setSetupState("done");
    } else if (result.error.includes("already")) {
      setSetupState("done");
    } else {
      setSetupState("unavailable");
    }
  }

  return (
    <div className="obsidian-sheen flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Wordmark className="text-2xl" />
          <p className="text-sm text-muted-foreground">Administrator access only.</p>
        </div>

        <form onSubmit={handleSignIn} className="glass rounded-2xl p-6">
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring"
            placeholder="administrator@example.com"
          />
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring"
            placeholder="••••••••"
          />
          {error && <p className="mb-3 text-sm text-destructive" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center">
          {setupState === "idle" && (
            <button
              type="button"
              onClick={handleSetup}
              className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              First-time setup
            </button>
          )}
          {setupState === "busy" && <p className="text-xs text-muted-foreground">Preparing the administrator account…</p>}
          {setupState === "done" && (
            <p className="text-xs text-muted-foreground">
              Setup complete. Sign in with the administrator credentials, then set a new password.
            </p>
          )}
          {setupState === "unavailable" && (
            <p className="text-xs text-muted-foreground">Setup is not available. Contact the site owner.</p>
          )}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground/70">
          <a href="/" className="underline-offset-4 hover:text-foreground hover:underline">← Back to TeleKamera</a>
        </p>
      </div>
    </div>
  );
}
