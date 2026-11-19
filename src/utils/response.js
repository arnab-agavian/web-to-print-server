export function sendSuccess(res, status, message, data = null) {
  return res
    .status(status)
    .json({ status, success: true, message, response: { data } });
}
export function sendError(res, status, message, data = null) {
  return res
    .status(status)
    .json({ status, success: false, message, response: { data } });
}
export const successResponse = sendSuccess;
export const errorResponse = sendError;
