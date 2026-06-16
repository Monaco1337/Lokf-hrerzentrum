import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  experimental: {
    // The wizard's FileDropzone uploads documents (PDF/PNG/JPG/WEBP up to
    // 15 MB) through the `uploadFile` Server Action. Next.js caps Server
    // Action bodies at 1 MB by default, which silently rejects larger files
    // with "An unexpected response was received from the server". We raise the
    // limit to comfortably cover MAX_UPLOAD_BYTES (15 MB) plus FormData
    // multipart overhead.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
