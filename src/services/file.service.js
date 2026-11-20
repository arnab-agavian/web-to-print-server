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

  const { data: signed, error: signedError } = await bucket.createSignedUrl(
    storagePath,
    SIGNED_URL_TTL_SECONDS,
  );
  if (signedError) {
    await bucket.remove([storagePath]);
    throw storageError("File uploaded but its signed URL could not be created.", signedError);
  }

  return {
    bucket: UPLOAD_BUCKET,
    path: storagePath,
    originalName: safeOriginalName(file.originalname),
    mimeType: file.mimetype,
    size: file.size,
    category: metadata.category,
    signedUrl: signed.signedUrl,
    signedUrlExpiresIn: SIGNED_URL_TTL_SECONDS,
  };
}
