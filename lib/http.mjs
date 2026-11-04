export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
export function json(res, status, data) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.statusCode = status;
  res.end(JSON.stringify(data));
}
export async function body(req) {
  if (!(req.headers["content-type"] || "").startsWith("application/json")) throw new HttpError(415, "Yêu cầu phải có định dạng JSON.");
  if (req.body && typeof req.body === "object") {
    if (Buffer.byteLength(JSON.stringify(req.body)) > 1000000) throw new HttpError(413,"Dữ liệu quá lớn.");
    return req.body;
  }
  let text = "", size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > 1000000) throw new HttpError(413, "Dữ liệu quá lớn.");
    text += chunk;
  }
  try { return JSON.parse(text); } catch { throw new HttpError(400, "Dữ liệu JSON không hợp lệ."); }
}
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) throw new HttpError(403, "Thiếu nguồn yêu cầu.");
  let host;
  try { host = new URL(origin).host; } catch { throw new HttpError(403, "Nguồn yêu cầu không hợp lệ."); }
  const trustedHost = process.env.VERCEL && req.headers['x-forwarded-host'] ? String(req.headers['x-forwarded-host']).split(',')[0].trim() : req.headers.host;
  if (host !== trustedHost) throw new HttpError(403, "Nguồn yêu cầu không được phép.");
}
export function fail(res, error) {
  if (!(error instanceof HttpError)) console.error("Luy Finance API:", error.name, error.message);
  json(res, error instanceof HttpError ? error.status : 502, {
    error: error instanceof HttpError ? error.message : "Không thể kết nối Google Sheets. Kiểm tra cấu hình và quyền chia sẻ rồi thử lại.",
    ...(error instanceof HttpError && error.details ? { details: error.details } : {}),
  });
}
