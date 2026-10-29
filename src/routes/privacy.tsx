import { createFileRoute } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — TeleKamera" },
      { name: "description", content: "TeleKamera privacy: no accounts, no analytics on your video, and downloads served directly from this site." },
      { property: "og:title", content: "Privacy Policy — TeleKamera" },
      { property: "og:description", content: "TeleKamera collects no personal data and never sees your video." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    title: "What we collect",
    body: "Nothing about you. TeleKamera does not require an account, does not ask for your name or email, and does not run advertising or third-party analytics inside the apps. The download page records no personal data — it counts downloads in aggregate so we know which release to keep online.",
  },
  {
    title: "Your video",
    body: "Video from your phone never touches our servers. Over USB it travels directly through the cable. Over Wi-Fi it stays on your local network between your phone and your PC. It is never uploaded, stored, or relayed anywhere else.",
  },
  {
    title: "Files you download",
    body: "Every release is served directly by this site and lists its SHA-256 checksum, so you can verify the file has not been altered. We never distribute TeleKamera through third-party file sharing.",
  },
  {
    title: "Changes",
    body: "If this policy changes, the new version will appear on this page with the updated date. Material changes to what is collected will be called out in the release notes.",
  },
];

function PrivacyPage() {
  return (
    <div className="obsidian-sheen min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl font-bold">Privacy policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">In short: TeleKamera collects no personal data and never sees your video.</p>

        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-lg font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
