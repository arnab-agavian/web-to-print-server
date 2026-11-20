import multer from "multer";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

const parser = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: MAX_UPLOAD_BYTES,
    fields: 5,
  },
  fileFilter(req, file, callback) {
    if (ALLOWED_UPLOAD_TYPES.has(file.mimetype)) return callback(null, true);
    const error = new Error(
      "Unsupported file type. Use PNG, JPEG, WebP, or PDF.",
    );
    error.status = 415;
    return callback(error);
  },
});

export function parseSingleUpload(req, res, next) {
  return parser.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      error.status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    }
    return error ? next(error) : next();
  });
}
