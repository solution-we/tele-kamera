// Input and file validation rules for releases. Isomorphic: used by server
// functions, the upload UI and the test suite. No I/O here.
import { z } from "zod";

export type ReleasePlatform = "android" | "windows";
export type ReleaseChannel = "stable" | "beta" | "pre_release";

export const platformSchema = z.enum(["android", "windows"]);
export const channelSchema = z.enum(["stable", "beta", "pre_release"]);

/** e.g. 1.0.0, v0.5.2-beta.1 — numbers with up to four segments plus an optional tag. */
export const versionRegex = /^[vV]?\d+(\.\d+){0,3}([-+_.][A-Za-z0-9.]+)?$/;

export const versionSchema = z
  .string()
  .trim()
  .min(1, "Version is required")
  .max(32)
  .regex(versionRegex, "Use a version like 1.0.0 (optional v prefix and -beta tag)");

export const buildNumberSchema = z
  .string()
  .trim()
  .max(32)
  .regex(/^[A-Za-z0-9._+-]*$/, "Build number may contain letters, numbers and . _ + - only");

export const notesSchema = z.string().max(10_000, "Release notes are too long (max 10,000 characters)");

export const filenameSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine((s) => !s.includes("/") && !s.includes("\\") && !s.includes("..") && !s.includes("\0"), {
    message: "Unsafe filename",
  });

export const minOsVersionSchema = z
  .string()
  .trim()
  .max(32)
  .regex(/^[A-Za-z0-9._+ -]*$/, "Minimum OS version may contain letters, numbers, spaces and . _ + - only");

export const isoDateSchema = z.string().datetime({ offset: true });

/** Storage keys for uploads must live under the uploading admin's own prefix. */
export function uploadKeySchema(userId: string) {
  return z
    .string()
    .trim()
    .min(1)
    .max(600)
    .regex(/^[A-Za-z0-9/._-]+$/, "Unsafe storage key")
    .refine((key) => key.startsWith(`uploads/${userId}/`), {
      message: "Storage key must be inside your own upload folder",
    })
    .refine((key) => !key.split("/").some((part) => part === "." || part === ".."), {
      message: "Unsafe storage key",
    });
}

export const allowedExtensions: Record<ReleasePlatform, string[]> = {
  android: [".apk"],
  windows: [".exe", ".msi"],
};

export const mimeByExtension: Record<string, string> = {
  ".apk": "application/vnd.android.package-archive",
  ".exe": "application/vnd.microsoft.portable-executable",
  ".msi": "application/x-msi",
};

export function fileExtension(filename: string): string {
  const name = filename.toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot);
}

export function extensionAllowed(platform: ReleasePlatform, filename: string): boolean {
  return allowedExtensions[platform].includes(fileExtension(filename));
}

/** 1 GB, matching the storage bucket limit. */
export const MAX_RELEASE_BYTES = 1024 ** 3;

/**
 * File-signature (magic byte) check. A filename extension alone is not
 * sufficient validation.
 *  - .apk → ZIP: PK\x03\x04
 *  - .exe → MZ:  4D 5A
 *  - .msi → OLE compound file: D0 CF 11 E0
 */
export function checkMagicBytes(platform: ReleasePlatform, filename: string, head: Uint8Array): boolean {
  if (head.length < 4) return false;
  if (platform === "android") {
    if (fileExtension(filename) !== ".apk") return false;
    return head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
  }
  const ext = fileExtension(filename);
  if (ext === ".exe") return head[0] === 0x4d && head[1] === 0x5a;
  if (ext === ".msi") {
    return head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0;
  }
  return false;
}
