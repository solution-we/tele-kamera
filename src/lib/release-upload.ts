// Browser-side upload helper: streams the file straight to the private
// storage bucket with upload progress, then the server fn validates it.
import {
  extensionAllowed,
  MAX_RELEASE_BYTES,
  type ReleasePlatform,
} from "@/lib/release-validation";

export interface UploadResult {
  storageKey: string;
  filename: string;
  size: number;
}

/** Client-side pre-checks; the server re-validates everything independently. */
export function validateUploadFile(platform: ReleasePlatform, file: File): string | null {
  if (file.size === 0) return "The selected file is empty";
  if (file.size > MAX_RELEASE_BYTES) return "The file exceeds the 1 GB size limit";
  if (!extensionAllowed(platform, file.name)) {
    return platform === "android"
      ? "Only .apk files are accepted for Android"
      : "Only .exe or .msi files are accepted for Windows";
  }
  return null;
}

export async function uploadReleaseFile(options: {
  file: File;
  userId: string;
  accessToken: string;
  onProgress?: (percent: number) => void;
}): Promise<UploadResult> {
  const { file, userId, accessToken, onProgress } = options;
  const path = `uploads/${userId}/${crypto.randomUUID()}/${file.name}`;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `${import.meta.env["VITE_SUPABASE_URL"] as string}/storage/v1/object/releases/${encodedPath}`;

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ storageKey: path, filename: file.name, size: file.size });
      } else {
        reject(new Error(`Upload failed (HTTP ${xhr.status}). Try again.`));
      }
    };
    xhr.send(file);
  });
}
