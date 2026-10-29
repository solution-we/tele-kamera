// Reads versionName / versionCode out of an Android .apk by parsing its
// AndroidManifest.xml. Browser-only (the parser unzips via Blob); the dynamic
// import keeps this heavy dependency out of the initial bundle.
export interface ApkVersionInfo {
  versionName: string;
  versionCode?: string;
}

interface ApkParserInstance {
  parse(): Promise<{ versionName?: unknown; versionCode?: unknown }>;
}

type ApkParserCtor = new (file: File | Blob | string) => ApkParserInstance;

/** Returns null when the APK can't be read — callers must stay unblocked. */
export async function readApkVersion(input: File | Blob | string): Promise<ApkVersionInfo | null> {
  try {
    const mod = (await import("app-info-parser")) as { default?: unknown } | unknown;
    const ApkParser = ((mod as { default?: unknown }).default ?? mod) as ApkParserCtor;
    const info = await new ApkParser(input).parse();

    const versionName = typeof info.versionName === "string" ? info.versionName.trim() : "";
    if (!versionName) return null;

    const versionCode =
      info.versionCode === null || info.versionCode === undefined ? undefined : String(info.versionCode);
    return versionCode === undefined
      ? { versionName }
      : { versionName, versionCode };
  } catch {
    return null;
  }
}
