import { createFileRoute } from "@tanstack/react-router";

import { getLatestPublishedReleases, type LatestReleases } from "@/lib/releases.functions";
import { PlatformDownload } from "./download.android";

export const Route = createFileRoute("/download/windows")({
  loader: () => getLatestPublishedReleases(),
  head: () => ({
    meta: [
      { title: "Download for Windows — TeleKamera" },
      { name: "description", content: "Download the latest TeleKamera companion app for Windows. Direct installer download." },
      { property: "og:title", content: "Download for Windows — TeleKamera" },
      { property: "og:description", content: "Latest TeleKamera Windows installer download." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: function WindowsDownload() {
    const latest = Route.useLoaderData() as LatestReleases;
    return <PlatformDownload platform="windows" latest={latest} />;
  },
});
