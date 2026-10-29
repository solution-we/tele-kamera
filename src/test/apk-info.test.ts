import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { readFileSync } from "node:fs";

import { readApkVersion } from "@/lib/apk-info";
import { versionSchema } from "@/lib/release-validation";

const manifestFixture = () => readFileSync(join(__dirname, "fixtures/android-manifest.xml.bin"));

async function writeTestApk(manifestBytes: Uint8Array): Promise<string> {
  const zip = new JSZip();
  zip.file("AndroidManifest.xml", manifestBytes);
  zip.file("META-INF/MANIFEST.MF", "Manifest-Version: 1.0\n");
  const dir = mkdtempSync(join(tmpdir(), "apk-test-"));
  const apkPath = join(dir, "test-app.apk");
  writeFileSync(apkPath, await zip.generateAsync({ type: "nodebuffer" }));
  return apkPath;
}

describe("APK version detection", () => {
  it("reads versionName and versionCode from an APK manifest", async () => {
    const apkPath = await writeTestApk(manifestFixture());
    try {
      const info = await readApkVersion(apkPath);
      expect(info).not.toBeNull();
      expect(info?.versionName).toBe("2.0.2");
      expect(info?.versionCode).toBe("2000052");
    } finally {
      rmSync(apkPath, { force: true });
    }
  });

  it("returns null for a broken APK instead of throwing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "apk-test-"));
    const apkPath = join(dir, "broken.apk");
    try {
      writeFileSync(apkPath, new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]));
      expect(await readApkVersion(apkPath)).toBeNull();
    } finally {
      rmSync(apkPath, { force: true });
    }
  });

  it("produces a version the release form accepts", async () => {
    const apkPath = await writeTestApk(manifestFixture());
    try {
      const info = await readApkVersion(apkPath);
      expect(versionSchema.safeParse(info?.versionName ?? "").success).toBe(true);
    } finally {
      rmSync(apkPath, { force: true });
    }
  });
});
