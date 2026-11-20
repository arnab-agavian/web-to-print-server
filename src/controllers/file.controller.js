import {
  deleteFile as removeStoredFile,
  refreshSignedUrl as refreshStoredFileUrl,
  uploadFile as storeFile,
} from "../services/file.service.js";
import {
  deleteFileSchema,
  refreshSignedUrlSchema,
  uploadMetadataSchema,
} from "../validation/file.validation.js";
import { errorResponse, successResponse } from "../utils/response.js";

export async function uploadFile(req, res, next) {
  try {
    if (!req.file) return errorResponse(res, 400, "A file field is required.");
    const metadata = uploadMetadataSchema.parse(req.body);
    return successResponse(
      res,
      201,
      "File uploaded successfully.",
      await storeFile(req.file, metadata, req.user),
    );
  } catch (error) {
    return next(error);
  }
}

export async function refreshSignedUrl(req, res, next) {
  try {
    const input = refreshSignedUrlSchema.parse(req.body);
    return successResponse(
      res,
      200,
      "Signed URL refreshed successfully.",
      await refreshStoredFileUrl(input.path, req.user),
    );
  } catch (error) {
    return next(error);
  }
}

export async function deleteFile(req, res, next) {
  try {
    const input = deleteFileSchema.parse(req.body);
    return successResponse(
      res,
      200,
      "File deleted successfully.",
      await removeStoredFile(input.publicUrl, req.user),
    );
  } catch (error) {
    return next(error);
  }
}
