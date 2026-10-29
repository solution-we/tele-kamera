import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — TeleKamera" },
      { name: "description", content: "Everything TeleKamera can do: 1080p60 video, USB or Wi-Fi connection, rotation and flip, and compatibility with every meeting and streaming app." },
      { property: "og:title", content: "Features — TeleKamera" },
      { property: "og:description", content: "1080p60 video, USB or Wi-Fi, rotation and flip — everything TeleKamera can do." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeaturesPage,
});

const featureGroups = [
  {
    heading: "Video",
    items: [
      { title: "Up to 1080p at 60 FPS", desc: "Smooth, sharp video that looks far better than a built-in webcam." },
      { title: "Rotation & flip", desc: "Turn and mirror the picture so it always faces the right way." },
      { title: "Adjustable quality", desc: "Pick the resolution and frame rate that fit your connection." },
    ],
  },
  {
    heading: "Connection",
    items: [
      { title: "USB — plug and play", desc: "Connect the phone with a cable. No setup, stable and low latency." },
      { title: "Wi-Fi — wireless", desc: "Pair over the local network when the cable is out of reach." },
      { title: "Works with all apps", desc: "Meet, Zoom, Discord, OBS and anything else that accepts a webcam." },
    ],
  },
  {
    heading: "Practical",
    items: [
      { title: "Simple & clean", desc: "Two apps, three steps, no accounts and no ads." },
      { title: "Free updates", desc: "Every published release is served directly from this site." },
      { title: "Checksums published", desc: "Each release lists its SHA-256 so you can verify the file." },
    ],
  },
];

function FeaturesPage() {
  return (
    <div className="obsidian-sheen min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl font-bold">Features</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          TeleKamera turns your Android phone into a webcam for your Windows PC — with the image quality a phone camera already has.
        </p>

        {featureGroups.map((group) => (
          <section key={group.heading} className="mt-12">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.heading}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {group.items.map((item) => (
                <div key={item.title} className="glass rounded-2xl p-5">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-12">
          <Link to="/downloads" className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Get TeleKamera →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
