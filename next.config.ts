import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'

const nextConfig: NextConfig = {
  /* config options here */
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
