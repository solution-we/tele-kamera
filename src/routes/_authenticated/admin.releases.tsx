import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";

import { readApkVersion } from "@/lib/apk-info";

import {
  deleteRelease,
  listAllReleases,
  registerRelease,
  replaceReleaseBinary,
  setReleaseStatus,
  updateRelease,
  type AdminRelease,
} from "@/lib/admin.functions";
import { uploadReleaseFile, validateUploadFile } from "@/lib/release-upload";
import { supabase } from "@/integrations/supabase/client";
import { formatBytes, formatDate, formatVersion } from "@/components/site/format";
import { platformSchema, channelSchema } from "@/lib/release-validation";

export const Route = createFileRoute("/_authenticated/admin/releases")({
  ssr: false,
  component: ReleasesPage,
});

type Platform = "android" | "windows";
type Channel = "stable" | "beta" | "pre_release";

const channelLabel: Record<Channel, string> = { stable: "Stable", beta: "Beta", pre_release: "Pre-release" };
const statusLabel: Record<string, string> = { draft: "Draft", published: "Published", archived: "Archived" };

function ReleasesPage() {
  const queryClient = useQueryClient();
  const releases = useQuery({ queryKey: ["admin-releases"], queryFn: useServerFn(listAllReleases) });
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<AdminRelease | null>(null);
  const [deleting, setDeleting] = useState<AdminRelease | null>(null);
  const [replacing, setReplacing] = useState<AdminRelease | null>(null);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin-releases"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  }

  async function act(releaseId: string, action: "publish" | "unpublish" | "archive") {
    await setReleaseStatus({ data: { releaseId, action } });
    refresh();
  }

  const rows = releases.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Releases</h1>
          <p className="mt-1 text-sm text-muted-foreground">Upload, publish and manage Android and Windows builds.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          New release
        </button>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        {releases.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading releases…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No releases yet. Upload the first build to get started.</p>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="min-w-40 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold">{formatVersion(r.version)}</span>
                    <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {r.platform === "android" ? "Android" : "Windows"}
                    </span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${r.channel === "stable" ? "bg-secondary text-secondary-foreground" : "bg-accent text-muted-foreground"}`}>
                      {channelLabel[r.channel as Channel]}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(r.released_at)} · {formatBytes(r.file_size)} · {r.original_filename}
                    {r.sha256 ? ` · SHA-256 ${r.sha256.slice(0, 12)}…` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {r.status !== "published" && (
                    <button onClick={() => act(r.id, "publish")} className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90">Publish</button>
                  )}
                  {r.status === "published" && (
                    <button onClick={() => act(r.id, "unpublish")} className="rounded-lg border border-input px-3 py-1.5 hover:bg-accent">Unpublish</button>
                  )}
                  {r.status !== "archived" && (
                    <button onClick={() => act(r.id, "archive")} className="rounded-lg border border-input px-3 py-1.5 hover:bg-accent">Archive</button>
                  )}
                  <button onClick={() => setEditing(r)} className="rounded-lg border border-input px-3 py-1.5 hover:bg-accent">Edit</button>
                  <button onClick={() => setReplacing(r)} className="rounded-lg border border-input px-3 py-1.5 hover:bg-accent">Replace file</button>
                  <button onClick={() => setDeleting(r)} className="rounded-lg border border-destructive/40 px-3 py-1.5 text-destructive hover:bg-destructive/10">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNew && <NewReleaseDialog onClose={() => { setShowNew(false); refresh(); }} />}
      {editing && <EditReleaseDialog release={editing} onClose={() => { setEditing(null); refresh(); }} />}
      {replacing && <ReplaceFileDialog release={replacing} onClose={() => { setReplacing(null); refresh(); }} />}
      {deleting && (
        <Modal title="Delete release?">
          <p className="text-sm text-muted-foreground">
            This permanently removes {formatVersion(deleting.version)} ({deleting.platform}) and its uploaded file. This cannot be undone.
          </p>
          <DeleteConfirm id={deleting.id} onDone={() => { setDeleting(null); refresh(); }} />
        </Modal>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "published"
      ? "bg-success/15 text-success"
      : status === "draft"
        ? "bg-secondary text-secondary-foreground"
        : "bg-accent text-muted-foreground";
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>{statusLabel[status] ?? status}</span>;
}

function Modal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="glass w-full max-w-lg rounded-2xl p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const labelCls = "mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

function NewReleaseDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState<Platform>("android");
  const [channel, setChannel] = useState<Channel>("stable");
  const [version, setVersion] = useState("");
  const [buildNumber, setBuildNumber] = useState("");
  const [releasedAt, setReleasedAt] = useState("");
  const [minOs, setMinOs] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const detectToken = useRef(0);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setDetected(null);
    if (!picked || platform !== "android") return;
    const token = ++detectToken.current;
    setDetecting(true);
    const info = await readApkVersion(picked);
    if (token !== detectToken.current) return;
    setDetecting(false);
    if (info) {
      setVersion(info.versionName);
      if (info.versionCode) setBuildNumber(info.versionCode);
      setDetected(info.versionCode ? `${info.versionName} (build ${info.versionCode})` : info.versionName);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!file) { setError("Choose an installer file to upload."); return; }
    const precheck = validateUploadFile(platform, file);
    if (precheck) { setError(precheck); return; }
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      const userId = session.session?.user.id;
      if (!accessToken || !userId) throw new Error("Your session expired. Sign in again.");
      setProgress(0);
      const upload = await uploadReleaseFile({
        file,
        userId,
        accessToken,
        onProgress: setProgress,
      });
      const result = await registerRelease({
        data: {
          platform,
          version: version.trim(),
          buildNumber: buildNumber.trim() || undefined,
          channel,
          releaseNotes: notes,
          releasedAt: releasedAt ? new Date(`${releasedAt}T12:00:00Z`).toISOString() : undefined,
          minOsVersion: minOs.trim() || undefined,
          storageKey: upload.storageKey,
          originalFilename: upload.filename,
        },
      });
      if (!result.ok) throw new Error(result.error);
      void queryClient.invalidateQueries({ queryKey: ["admin-releases"] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New release">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="platform">Platform</label>
            <select id="platform" value={platform} onChange={(e) => setPlatform(platformSchema.parse(e.target.value))} className={inputCls}>
              <option value="android">Android (.apk)</option>
              <option value="windows">Windows (.exe / .msi)</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="channel">Channel</label>
            <select id="channel" value={channel} onChange={(e) => setChannel(channelSchema.parse(e.target.value))} className={inputCls}>
              <option value="stable">Stable</option>
              <option value="beta">Beta</option>
              <option value="pre_release">Pre-release</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="version">Version *</label>
            <input id="version" required value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="build">Build number</label>
            <input id="build" value={buildNumber} onChange={(e) => setBuildNumber(e.target.value)} placeholder="1001" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="date">Release date</label>
            <input id="date" type="date" value={releasedAt} onChange={(e) => setReleasedAt(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="minos">Minimum {platform === "android" ? "Android" : "Windows"} version</label>
            <input id="minos" value={minOs} onChange={(e) => setMinOs(e.target.value)} placeholder={platform === "android" ? "8.0" : "10"} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="notes">Release notes</label>
          <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="file">Installer file *</label>
          <input
            id="file"
            type="file"
            accept={platform === "android" ? ".apk" : ".exe,.msi"}
            onChange={onFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
          />
          {platform === "android" && file && (
            detecting ? (
              <p className="mt-1 text-xs text-muted-foreground">Reading version from the APK…</p>
            ) : detected ? (
              <p className="mt-1 text-xs text-success" role="status">
                Detected from APK: {detected} — you can still edit it before saving.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Couldn't read the version from this file — enter it manually.</p>
            )
          )}
        </div>
        {progress !== null && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-accent">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {busy ? `Uploading ${progress ?? 0}%…` : "Save as draft"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">New releases are saved as drafts. The server verifies the file signature and computes size and SHA-256 itself.</p>
      </form>
    </Modal>
  );
}

function EditReleaseDialog({ release, onClose }: { release: AdminRelease; onClose: () => void }) {
  const [version, setVersion] = useState(release.version);
  const [buildNumber, setBuildNumber] = useState(release.build_number ?? "");
  const [channel, setChannel] = useState<Channel>(release.channel as Channel);
  const [releasedAt, setReleasedAt] = useState(release.released_at ? release.released_at.slice(0, 10) : "");
  const [minOs, setMinOs] = useState(release.min_os_version ?? "");
  const [notes, setNotes] = useState(release.release_notes);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await updateRelease({
      data: {
        releaseId: release.id,
        version: version.trim(),
        buildNumber: buildNumber.trim() || null,
        channel,
        releaseNotes: notes,
        releasedAt: releasedAt ? new Date(`${releasedAt}T12:00:00Z`).toISOString() : null,
        minOsVersion: minOs.trim() || null,
      },
    });
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    onClose();
  }

  return (
    <Modal title={`Edit ${formatVersion(release.version)} (${release.platform})`}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="ev">Version</label>
            <input id="ev" required value={version} onChange={(e) => setVersion(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="eb">Build number</label>
            <input id="eb" value={buildNumber} onChange={(e) => setBuildNumber(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="ec">Channel</label>
            <select id="ec" value={channel} onChange={(e) => setChannel(channelSchema.parse(e.target.value))} className={inputCls}>
              <option value="stable">Stable</option>
              <option value="beta">Beta</option>
              <option value="pre_release">Pre-release</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="ed">Release date</label>
            <input id="ed" type="date" value={releasedAt} onChange={(e) => setReleasedAt(e.target.value)} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className={labelCls} htmlFor="em">Minimum OS version</label>
            <input id="em" value={minOs} onChange={(e) => setMinOs(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="en">Release notes</label>
          <textarea id="en" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-accent">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReplaceFileDialog({ release, onClose }: { release: AdminRelease; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    const precheck = validateUploadFile(release.platform as Platform, file);
    if (precheck) { setError(precheck); return; }
    setBusy(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      const userId = session.session?.user.id;
      if (!accessToken || !userId) throw new Error("Your session expired. Sign in again.");
      setProgress(0);
      const upload = await uploadReleaseFile({ file, userId, accessToken, onProgress: setProgress });
      const result = await replaceReleaseBinary({
        data: { releaseId: release.id, storageKey: upload.storageKey, originalFilename: upload.filename },
      });
      if (!result.ok) throw new Error(result.error);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Replace file for ${formatVersion(release.version)}`}>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="file"
          accept={release.platform === "android" ? ".apk" : ".exe,.msi"}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
        />
        {progress !== null && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-accent">Cancel</button>
          <button type="submit" disabled={busy || !file} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {busy ? `Uploading ${progress ?? 0}%…` : "Replace file"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteConfirm({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    const result = await deleteRelease({ data: { releaseId: id } });
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    onDone();
  }

  return (
    <div className="mt-4 flex justify-end gap-2">
      {error && <p className="mr-auto text-sm text-destructive">{error}</p>}
      <button onClick={onDone} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-accent">Cancel</button>
      <button onClick={confirm} disabled={busy} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
        {busy ? "Deleting…" : "Delete permanently"}
      </button>
    </div>
  );
}
