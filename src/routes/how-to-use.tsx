import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";

export const Route = createFileRoute("/how-to-use")({
  head: () => ({
    meta: [
      { title: "How to Use — TeleKamera" },
      { name: "description", content: "Set up TeleKamera in three steps: install the Android app, connect to your PC over USB or Wi-Fi, and start streaming from the Windows app." },
      { property: "og:title", content: "How to Use — TeleKamera" },
      { property: "og:description", content: "Install, connect, stream — TeleKamera setup in three steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowToUsePage,
});

const steps = [
  {
    n: 1,
    title: "Install on Android",
    body: [
      "Download the TeleKamera APK from the downloads page and open it on your phone.",
      "Android may ask you to allow installs from your browser — allow it once, then confirm the install.",
      "Open the app and give it camera permission. It shows your connection code for the next step.",
    ],
  },
  {
    n: 2,
    title: "Connect to your PC",
    body: [
      "USB: plug the phone into your PC with a data cable. The connection is detected automatically.",
      "Wi-Fi: make sure the phone and PC are on the same network, then enter the connection code from the phone into the Windows app.",
      "On the phone, confirm the connection request when it appears.",
    ],
  },
  {
    n: 3,
    title: "Start streaming",
    body: [
      "In the Windows app, choose your TeleKamera device and select Start Streaming.",
      "Open any app that accepts a webcam — Meet, Zoom, Discord, OBS — and pick TeleKamera as the camera.",
      "Use rotation and flip in the phone app if the picture needs adjusting.",
    ],
  },
];

function HowToUsePage() {
  return (
    <div className="obsidian-sheen min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-4xl font-bold">How to use</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Setup takes about five minutes. You need the TeleKamera app on your Android phone and the Windows app on your PC.
        </p>

        <ol className="mt-10 space-y-6">
          {steps.map((step) => (
            <li key={step.n} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-sm font-semibold">{step.n}</span>
                <h2 className="font-display text-lg font-semibold">{step.title}</h2>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {step.body.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="text-muted-foreground/60">·</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/download/android" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Android app
          </Link>
          <Link to="/download/windows" className="rounded-lg border border-input px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent">
            Windows app
          </Link>
          <Link to="/faq" className="rounded-lg px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground">
            Problems? Read the FAQ →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
