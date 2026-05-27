import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'

const nextConfig: NextConfig = {
  // @react-pdf/renderer bundles native-ish deps (yoga-layout WASM, pdfkit
  // streams) that Next's serverless bundler trips over. Marking it
  // external means Vercel installs it as a normal node_modules dep at
  // runtime instead of trying to bundle it into the function.
  serverExternalPackages: ['@react-pdf/renderer'],
}

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  fallbacks: { document: '/offline' },
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^\/api\/(metrics|targets|numbers)/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'api-cache',
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})(nextConfig)
