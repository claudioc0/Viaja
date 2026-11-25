import sentryNextjs from '@sentry/nextjs';

const { withSentryConfig } = sentryNextjs;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@viaja/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

const hasSentryDsn = Boolean(
  process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || process.env.SENTRY_DSN?.trim(),
);

export default hasSentryDsn
  ? withSentryConfig(nextConfig, {
      silent: true,
      telemetry: false,
    })
  : nextConfig;
