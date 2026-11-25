export function getClientIp(req) {
  const address = req.ip || req.socket?.remoteAddress || "unknown";
  return String(address).replace(/^::ffff:/, "").slice(0, 45);
}
