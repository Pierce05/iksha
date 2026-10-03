/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // Serve the static app at "/" without a redirect (a redirected response breaks service-worker offline navigation).
  async rewrites() {
    return { beforeFiles: [{ source: '/', destination: '/index.html' }], afterFiles: [], fallback: [] };
  },
};
