import { createFileRoute } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import phoneHome from "@/assets/screen-phone-home.jpg";
import phoneSettings from "@/assets/screen-phone-settings.jpg";
import windowsApp from "@/assets/screen-windows-app.jpg";

export const Route = createFileRoute("/screenshots")({
  head: () => ({
    meta: [
      { title: "Screenshots — TeleKamera" },
      { name: "description", content: "See the TeleKamera interface: the Android home and settings screens and the Windows streaming app. Same clean design on both." },
      { property: "og:title", content: "Screenshots — TeleKamera" },
      { property: "og:description", content: "The Android and Windows interface of TeleKamera, side by side." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScreenshotsPage,
});

const shots = [
  { src: phoneHome, alt: "TeleKamera Android home screen", caption: "Android home — one button to start, connection code at the top." },
  { src: phoneSettings, alt: "TeleKamera Android settings screen", caption: "Android settings — resolution, frame rate, rotation and flip." },
  { src: windowsApp, alt: "TeleKamera Windows app", caption: "Windows app — pick your phone, then start streaming." },
];

function ScreenshotsPage() {
  return (
    <div className="obsidian-sheen min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl font-bold">Screenshots</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Real interface, no mockups. Same design language on Android and Windows — built for real use.
        </p>

        <div className="mt-10 space-y-10">
          {shots.map((shot) => (
            <figure key={shot.alt} className="glass rounded-2xl p-5">
              <img src={shot.src} alt={shot.alt} className="w-full rounded-xl border border-border" loading="lazy" />
              <figcaption className="mt-3 text-sm text-muted-foreground">{shot.caption}</figcaption>
            </figure>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
