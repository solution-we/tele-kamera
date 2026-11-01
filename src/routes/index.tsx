import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LayoutGrid, RotateCw, Sparkles, Usb, Video, Wifi } from "lucide-react";

import { getLatestPublishedReleases } from "@/lib/releases.functions";
import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import { formatBytes, formatDate, formatVersion } from "@/components/site/format";
import { AndroidIcon, CheckIcon, WindowsIcon, ZipIcon } from "@/components/site/icons";
import heroDevices from "@/assets/hero-devices-hq.jpg";
import phoneHome from "@/assets/screen-phone-home-hq.jpg";
import phoneSettings from "@/assets/screen-phone-settings-hq.jpg";
import windowsApp from "@/assets/screen-windows-app-hq.jpg";

export const Route = createFileRoute("/")({
  loader: () => getLatestPublishedReleases(),
  head: () => ({
    meta: [
      { title: "TeleKamera — Your pocket studio" },
      { name: "description", content: "Turn your Android phone into a webcam for your Windows PC. USB or Wi-Fi, simple, fast, and free." },
      { property: "og:title", content: "TeleKamera — Your pocket studio" },
      { property: "og:description", content: "Turn your Android phone into a webcam for your Windows PC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const features = [
  { title: "High quality video", desc: "Up to 1080p · 60 FPS", icon: Video },
  { title: "USB connection", desc: "Plug and play", icon: Usb },
  { title: "Wi-Fi connection", desc: "Pair on local network", icon: Wifi },
  { title: "Rotation & flip", desc: "Adjust your camera view", icon: RotateCw },
  { title: "Works with all apps", desc: "Meet, Discord, OBS, etc.", icon: LayoutGrid },
  { title: "Simple & clean", desc: "Minimal and easy to use", icon: Sparkles },
];

const steps = [
  { n: 1, title: "Install on Android", desc: "Download and install the TeleKamera app." },
  { n: 2, title: "Connect to your PC", desc: "Use a USB cable or connect over your local Wi-Fi network." },
  { n: 3, title: "Start streaming", desc: "Open the Windows app and select Start Streaming." },
];

function HomePage() {
  const latest = Route.useLoaderData();
  return (
    <div className="obsidian-sheen min-h-screen">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2">
          <div>
            <span className="inline-block rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Android + Windows
            </span>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Your pocket<br />studio.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Turn your Android phone into a webcam for your Windows PC. Simple, fast, and free.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {latest.android ? (
                <a href={`/download/android/${latest.android.id}`} className="glass glass-hover flex items-center gap-3 rounded-xl px-5 py-3">
                  <span className="text-2xl" aria-hidden>🤖</span>
                  <span>
                    <span className="block text-sm font-semibold">
                      Download for Android
                      {latest.android.channel !== "stable" && <ChannelTag channel={latest.android.channel} />}
                    </span>
                    <span className="block text-xs text-muted-foreground">APK · {formatVersion(latest.android.version)}</span>
                  </span>
                </a>
              ) : (
                <DisabledButton platform="Android" />
              )}
              {latest.windows ? (
                <a href={`/download/windows/${latest.windows.id}`} className="glass glass-hover flex items-center gap-3 rounded-xl px-5 py-3">
                  <span className="text-2xl" aria-hidden>🪟</span>
                  <span>
                    <span className="block text-sm font-semibold">
                      Download for Windows
                      {latest.windows.channel !== "stable" && <ChannelTag channel={latest.windows.channel} />}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {latest.windows.original_filename.endsWith(".msi")
                        ? "MSI"
                        : latest.windows.original_filename.endsWith(".exe")
                          ? "EXE"
                          : "ZIP"}{" "}
                      · {formatVersion(latest.windows.version)}
                    </span>
                  </span>
                </a>
              ) : (
                <DisabledButton platform="Windows" />
              )}
              {(latest.android || latest.windows) && (
                <a href="/api/public/download/bundle" className="glass glass-hover flex items-center gap-3 rounded-xl px-5 py-3">
                  <span className="text-2xl" aria-hidden>📦</span>
                  <span>
                    <span className="block text-sm font-semibold">Download both</span>
                    <span className="block text-xs text-muted-foreground">Android + Windows · one ZIP</span>
                  </span>
                </a>
              )}
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li>✓ USB &amp; Wi-Fi</li>
              <li>✓ High quality video</li>
              <li>✓ No extra hardware</li>
              <li>✓ Completely free</li>
            </ul>
          </div>
          <img
            src={heroDevices}
            alt="TeleKamera running on an Android phone and a Windows PC"
            className="w-full rounded-2xl border border-border"
            loading="eager"
          />
        </section>

        {/* Feature strip */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="glass grid grid-cols-2 gap-x-4 gap-y-8 rounded-2xl px-6 py-10 sm:grid-cols-3 lg:grid-cols-6">
            {features.map((f) => (
              <div key={f.title} className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary text-lg" aria-hidden>
                  ✦
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How it works</span>
              <h2 className="mt-2 font-display text-3xl font-bold">Get started in 3 steps</h2>
              <p className="mt-2 text-muted-foreground">Turn your phone into a webcam in just a few clicks.</p>
            </div>
            <Link to="/how-to-use" className="hidden rounded-full border border-border px-4 py-2 text-sm hover:bg-accent sm:block">
              View detailed guide →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="glass glass-hover rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-sm font-semibold">{s.n}</span>
                  <h3 className="font-semibold">{s.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Screenshots */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Real interface</span>
          <h2 className="mt-2 font-display text-3xl font-bold">Clean. Simple. Powerful.</h2>
          <p className="mt-2 text-muted-foreground">Same design on Android and Windows. Built for real use.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <img src={phoneHome} alt="TeleKamera Android home screen" className="rounded-2xl border border-border" loading="lazy" />
            <img src={phoneSettings} alt="TeleKamera Android settings screen" className="rounded-2xl border border-border" loading="lazy" />
            <img src={windowsApp} alt="TeleKamera Windows app" className="rounded-2xl border border-border sm:col-span-2" loading="lazy" />
          </div>
        </section>

        {/* Latest versions */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            <VersionCard
              label="Latest version"
              title={latest.android ? `Android ${formatVersion(latest.android.version)}` : "Android"}
              sub={latest.android ? `Released on ${formatDate(latest.android.released_at)} · ${formatBytes(latest.android.file_size)}` : "Coming soon"}
              href={latest.android ? `/download/android/${latest.android.id}` : undefined}
            />
            <VersionCard
              label="Latest version"
              title={latest.windows ? `Windows ${formatVersion(latest.windows.version)}` : "Windows"}
              sub={latest.windows ? `Released on ${formatDate(latest.windows.released_at)} · ${formatBytes(latest.windows.file_size)}` : "Coming soon"}
              href={latest.windows ? `/download/windows/${latest.windows.id}` : undefined}
            />
            <div className="glass glass-hover rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Previous versions</p>
                  <p className="mt-1 font-display text-lg font-semibold">Need an older version?</p>
                  <p className="text-xs text-muted-foreground">View all releases and download.</p>
                </div>
                <Link to="/downloads" aria-label="All releases" className="text-muted-foreground hover:text-foreground">→</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ChannelTag({ channel }: { channel: string }) {
  return (
    <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-accent-foreground">
      {channel === "beta" ? "Beta" : "Pre-release"}
    </span>
  );
}

function DisabledButton({ platform }: { platform: string }) {
  return (
    <span className="glass flex items-center gap-3 rounded-xl px-5 py-3 opacity-50" aria-disabled>
      <span>
        <span className="block text-sm font-semibold">Download for {platform}</span>
        <span className="block text-xs text-muted-foreground">Coming soon</span>
      </span>
    </span>
  );
}

function VersionCard({ label, title, sub, href }: { label: string; title: string; sub: string; href?: string | undefined }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-lg font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
        {href ? (
          <a href={href} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Download</a>
        ) : (
          <span className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground" aria-disabled>Coming soon</span>
        )}
      </div>
    </div>
  );
}
