import { createFileRoute } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — TeleKamera" },
      { name: "description", content: "The terms that apply to using and redistributing the TeleKamera apps." },
      { property: "og:title", content: "Terms of Use — TeleKamera" },
      { property: "og:description", content: "Terms that apply to using and redistributing TeleKamera." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

const sections = [
  {
    title: "Acceptance",
    body: "By downloading or using TeleKamera you agree to these terms. If you do not agree, do not use the apps.",
  },
  {
    title: "License",
    body: "You may use TeleKamera free of charge for personal and commercial purposes. You may share the apps with others, as long as you do not charge for them, claim them as your own work, or remove the TeleKamera branding.",
  },
  {
    title: "Acceptable use",
    body: "Do not use TeleKamera to record or stream people without their consent, or in any way that breaks the law in your jurisdiction. You are responsible for how you use the apps.",
  },
  {
    title: "No warranty",
    body: "TeleKamera is provided as is, without warranty of any kind. It may contain bugs, and features may change between releases. Always keep a backup of anything important on your devices.",
  },
  {
    title: "Liability",
    body: "To the fullest extent permitted by law, the TeleKamera authors are not liable for any damage or data loss arising from the use or inability to use the apps.",
  },
];

function TermsPage() {
  return (
    <div className="obsidian-sheen min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl font-bold">Terms of use</h1>
        <p className="mt-2 text-sm text-muted-foreground">The short version: use it freely, share it honestly, and be respectful with the camera.</p>

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
