import { createFileRoute } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import { PlatformDownload } from "./download.android";

export const Route = createFileRoute("/download/windows")({
  loader: () => import("@/lib/releases.functions").then((m) => m.getLatestStableReleases()),
  head: () => ({
    meta: [
      { title: "Download for Windows — TeleKamera" },
      { name: "description", content: "Download the latest stable TeleKamera companion app for Windows. Direct installer download." },
      { property: "og:title", content: "Download for Windows — TeleKamera" },
      { property: "og:description", content: "Latest stable TeleKamera Windows installer download." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PlatformDownload platform="windows" />,
});

// Site chrome re-export guard (keeps bundlers honest about this file's deps)
export const _chrome = { SiteFooter, SiteHeader };
