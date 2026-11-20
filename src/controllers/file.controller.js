import { uploadFile as storeFile } from "../services/file.service.js";
import { uploadMetadataSchema } from "../validation/file.validation.js";
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
