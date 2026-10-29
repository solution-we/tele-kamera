import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ & Support — TeleKamera" },
      { name: "description", content: "Answers to common TeleKamera questions: connection problems, image quality, phone compatibility, and where to find older releases." },
      { property: "og:title", content: "FAQ & Support — TeleKamera" },
      { property: "og:description", content: "Common questions about connection, quality and compatibility." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FaqPage,
});

const faqs = [
  {
    q: "Why is my phone not detected over USB?",
    a: "Make sure you are using a data cable, not a charge-only cable, and that you have enabled USB debugging or file transfer mode on the phone. If the Windows app still does not see it, try a different USB port.",
  },
  {
    q: "The Wi-Fi connection keeps failing.",
    a: "Both the phone and the PC must be on the same local network. Office and guest Wi-Fi networks often block device-to-device traffic — try a personal hotspot or a different network.",
  },
  {
    q: "The picture is blurry or lagging.",
    a: "Lower the resolution or frame rate in the phone app's settings. USB connections handle 1080p60 comfortably; on Wi-Fi, 720p30 is a safer start.",
  },
  {
    q: "Does it work with my meeting or streaming app?",
    a: "Yes. TeleKamera appears as a standard webcam, so it works with Meet, Zoom, Discord, OBS and any other app that accepts a camera device.",
  },
  {
    q: "Is it really free?",
    a: "Yes. Every published release is free to download from this site, with no accounts and no ads.",
  },
  {
    q: "How do I get an older version?",
    a: "All previously published releases stay on the downloads page, with their sizes and SHA-256 checksums.",
  },
];

function FaqPage() {
  return (
    <div className="obsidian-sheen min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl font-bold">FAQ & support</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          The questions we hear most. If your problem is not here, check the setup guide first — most issues are in step 2.
        </p>

        <div className="mt-10 space-y-4">
          {faqs.map((item) => (
            <details key={item.q} className="glass group rounded-2xl p-5">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                {item.q}
                <span aria-hidden className="float-right text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-10">
          <Link to="/how-to-use" className="inline-flex rounded-lg border border-input px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent">
            Open the setup guide →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
