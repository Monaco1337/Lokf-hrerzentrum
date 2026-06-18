/**
 * Legacy webhook path. The canonical route is /api/whatsapp/webhook; this
 * re-exports the same verified handlers so an already-registered Meta callback
 * URL keeps working. No unverified processing happens here.
 */
export { GET, POST, dynamic } from "@/app/api/whatsapp/webhook/route";
