/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  outputFileTracingRoot: process.cwd(),
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        os: false,
        path: false,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        http: false,
        https: false,
        zlib: false,
        querystring: false,
        url: false,
        buffer: false,
        util: false,
        events: false,
        string_decoder: false,
        timers: false,
        assert: false,
      }
    }
    return config
  },
}

// Sentry configuration
const sentryWebpackPluginOptions = {
  // Sentry organization and project
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,
  
  // Upload source maps
  silent: true, // Suppresses all logs
  
  // Source map configuration
  hideSourceMaps: true,
  widenClientFileUpload: true,
  
  // Automatically tree-shake Sentry logger statements
  disableLogger: true, // TODO: migrate to webpack.treeshake.removeDebugLogging in Sentry v9+
  
  // Tunnel Sentry requests to avoid ad-blockers
  tunnelRoute: '/monitoring/tunnel',
  
  // Disable Sentry if env vars not configured
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
}

// Make sure adding Sentry options is the last code to modify `nextConfig`
module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions)
