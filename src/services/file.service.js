import crypto from "node:crypto";
import path from "node:path";
import { supabase } from "../../supabase/supabase.js";

export const UPLOAD_BUCKET = "uploads";
export const SIGNED_URL_TTL_SECONDS = 3600;

const fileTypes = {
  "image/png": {
    extension: "png",
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  "image/jpeg": {
    extension: "jpg",
    matches: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  "image/webp": {
    extension: "webp",
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP",
  },
  "application/pdf": {
    extension: "pdf",
    matches: (buffer) =>
      buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-",
  },
};

function storageError(message, cause) {
  const error = new Error(message);
  error.status = 502;
  error.cause = cause;
  return error;
}

function invalidStorageReference(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function decodePath(pathname) {
  try {
    return pathname
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");
  } catch {
    throw invalidStorageReference("The storage path is not valid URL encoding.");
  }
}

function assertUploadAccess(parsed, user) {
  if (user.role !== "admin" && parsed.ownerId !== user.id) {
    const error = new Error("You do not have access to this file.");
    error.status = 403;
    throw error;
  }
}

export function parseUploadReference(reference) {
  const input = String(reference || "").trim();
  let bucket = UPLOAD_BUCKET;
  let storagePath = input;

  if (/^https?:\/\//i.test(input)) {
    let url;
    try {
      url = new URL(input);
    } catch {
      throw invalidStorageReference("The signed URL is invalid.");
    }
    const match = url.pathname.match(
      /^\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/(.+)$/,
    );
    if (!match) {
      throw invalidStorageReference("The URL is not a Supabase Storage URL.");
    }
    bucket = decodePath(match[1]);
    storagePath = decodePath(match[2]);
  } else {
    storagePath = input.replace(/^\/+/, "");
    if (storagePath.startsWith(`${UPLOAD_BUCKET}/`)) {
      storagePath = storagePath.slice(UPLOAD_BUCKET.length + 1);
    }
  }

  if (bucket !== UPLOAD_BUCKET) {
    throw invalidStorageReference(
      `Only files in the ${UPLOAD_BUCKET} bucket can be refreshed here.`,
    );
  }
  const segments = storagePath.split("/");
  if (
    !storagePath ||
    storagePath.includes("\\") ||
    segments.some(
      (segment) =>
        !segment || segment === "." || segment === ".." || /[\u0000-\u001f]/.test(segment),
    )
  ) {
    throw invalidStorageReference("The storage path is invalid.");
  }

  return { bucket, path: storagePath, ownerId: segments[0] };
}

export async function refreshSignedUrl(reference, user) {
  if (!supabase) {
    const error = new Error("Supabase Storage is not configured.");
    error.status = 503;
    throw error;
  }

  const parsed = parseUploadReference(reference);
  assertUploadAccess(parsed, user);

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw storageError("A fresh signed URL could not be created.", error);
  }

  return {
    bucket: parsed.bucket,
    path: parsed.path,
    signedUrl: data.signedUrl,
    signedUrlExpiresIn: SIGNED_URL_TTL_SECONDS,
    signedUrlExpiresAt: new Date(
      Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
    ).toISOString(),
  };
}

export async function deleteFile(publicUrl, user) {
  if (!supabase) {
    const error = new Error("Supabase Storage is not configured.");
    error.status = 503;
    throw error;
  }

  let url;
  try {
    url = new URL(publicUrl);
  } catch {
    throw invalidStorageReference("A valid public file URL is required.");
  }
  if (!/^\/storage\/v1\/object\/public\//.test(url.pathname)) {
    throw invalidStorageReference("A Supabase public object URL is required.");
  }

  const parsed = parseUploadReference(publicUrl);
  assertUploadAccess(parsed, user);

  const bucket = supabase.storage.from(parsed.bucket);
  const { error } = await bucket.remove([parsed.path]);
  if (error) {
    throw storageError("File deletion failed.", error);
  }

  const { data: publicUrlData } = bucket.getPublicUrl(parsed.path);
  return {
    bucket: parsed.bucket,
    path: parsed.path,
    publicUrl: publicUrlData.publicUrl,
    deleted: true,
  };
}

export async function downloadPublicFile(reference) {
  if (!supabase) {
    const error = new Error("Supabase Storage is not configured.");
    error.status = 503;
    throw error;
  }

  const parsed = parseUploadReference(reference);
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .download(parsed.path);
  if (error || !data) {
    throw storageError("Public template artwork could not be downloaded.", error);
  }
  return {
    bucket: parsed.bucket,
    path: parsed.path,
    buffer: Buffer.from(await data.arrayBuffer()),
  };
}

export function validateFileSignature(file) {
  const type = fileTypes[file.mimetype];
  if (!type || !type.matches(file.buffer)) {
    const error = new Error("File content does not match its declared type.");
    error.status = 415;
    throw error;
  }
  return type.extension;
}

function safeOriginalName(originalName) {
  return path
    .basename(originalName || "upload")
    .replace(/[^A-Za-z0-9._() -]/g, "_")
    .slice(0, 255);
}

export async function uploadFile(file, metadata, user) {
  if (!supabase) {
    const error = new Error("Supabase Storage is not configured.");
    error.status = 503;
    throw error;
  }

  const extension = validateFileSignature(file);
  const storagePath = `${user.id}/${metadata.category}/${crypto.randomUUID()}.${extension}`;
  const bucket = supabase.storage.from(UPLOAD_BUCKET);
  const { error: uploadError } = await bucket.upload(storagePath, file.buffer, {
    contentType: file.mimetype,
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) {
    throw storageError("File upload failed.", uploadError);
  }

  const { data: publicUrlData } = bucket.getPublicUrl(storagePath);

  return {
    bucket: UPLOAD_BUCKET,
    path: storagePath,
    originalName: safeOriginalName(file.originalname),
    mimeType: file.mimetype,
    size: file.size,
    category: metadata.category,
    publicUrl: publicUrlData.publicUrl,
  };
}
