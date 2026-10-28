import { describe, expect, it } from "vitest";

import {
  checkMagicBytes,
  extensionAllowed,
  versionSchema,
  uploadKeySchema,
  notesSchema,
} from "@/lib/release-validation";

describe("release upload validation", () => {
  it("accepts a valid semver-like version and rejects malformed ones", () => {
    expect(versionSchema.safeParse("1.0.0").success).toBe(true);
    expect(versionSchema.safeParse("v0.5.2-beta.1").success).toBe(true);
    expect(versionSchema.safeParse("2").success).toBe(true);
    expect(versionSchema.safeParse("").success).toBe(false);
    expect(versionSchema.safeParse("not-a-version").success).toBe(false);
    expect(versionSchema.safeParse("../../etc/passwd").success).toBe(false);
  });

  it("allows only the platform's real installer extensions", () => {
    expect(extensionAllowed("android", "app-v1.apk")).toBe(true);
    expect(extensionAllowed("android", "app.exe")).toBe(false);
    expect(extensionAllowed("windows", "setup.exe")).toBe(true);
    expect(extensionAllowed("windows", "setup.msi")).toBe(true);
    expect(extensionAllowed("windows", "setup.apk")).toBe(false);
  });

  it("verifies magic bytes, not just the extension", () => {
    const apkHead = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]);
    const exeHead = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
    const msiHead = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1]);
    const fakeHead = new Uint8Array([0x00, 0x01, 0x02, 0x03]);

    expect(checkMagicBytes("android", "app.apk", apkHead)).toBe(true);
    expect(checkMagicBytes("android", "app.apk", fakeHead)).toBe(false);
    expect(checkMagicBytes("windows", "setup.exe", exeHead)).toBe(true);
    expect(checkMagicBytes("windows", "setup.msi", msiHead)).toBe(true);
    expect(checkMagicBytes("windows", "setup.msi", exeHead)).toBe(false);
    expect(checkMagicBytes("windows", "setup.exe", fakeHead)).toBe(false);
    // A renamed exe cannot pass as an APK even with APK magic bytes elsewhere.
    expect(checkMagicBytes("windows", "setup.exe", apkHead)).toBe(false);
  });

  it("locks upload keys inside the admin's own upload folder", () => {
    const schema = uploadKeySchema("11111111-1111-1111-1111-111111111111");
    expect(schema.safeParse("uploads/11111111-1111-1111-1111-111111111111/abc/app.apk").success).toBe(true);
    expect(schema.safeParse("uploads/other-user/app.apk").success).toBe(false);
    expect(schema.safeParse("releases/steal/app.apk").success).toBe(false);
    expect(schema.safeParse("uploads/11111111-1111-1111-1111-111111111111/../secret").success).toBe(false);
  });

  it("caps release notes length", () => {
    expect(notesSchema.safeParse("hello").success).toBe(true);
    expect(notesSchema.safeParse("x".repeat(10_001)).success).toBe(false);
  });
});
