import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle OpenTelemetry and other Node.js modules that don't work in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        'handlebars': false,
        '@opentelemetry/winston-transport': false,
        '@opentelemetry/instrumentation-winston': false,
        '@opentelemetry/instrumentation': false,
        '@opentelemetry/sdk-node': false,
      };
    }

    // Ignore specific modules that cause issues
    config.externals = config.externals || [];
    if (typeof config.externals === 'function') {
      const originalExternals = config.externals;
      config.externals = (context: any, request: any, callback: any) => {
        if (request === '@opentelemetry/winston-transport' || 
            request === '@opentelemetry/instrumentation-winston' ||
            request === '@opentelemetry/instrumentation' ||
            request === '@opentelemetry/sdk-node' ||
            request === 'handlebars') {
          return callback(null, 'commonjs ' + request);
        }
        return originalExternals(context, request, callback);
      };
    }

    // Ignore critical dependency warnings for OpenTelemetry
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /@opentelemetry\/instrumentation/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    return config;
  },
  // Disable server-side rendering for problematic components
  serverExternalPackages: [
    '@opentelemetry/instrumentation-winston',
    '@opentelemetry/winston-transport',
    '@opentelemetry/instrumentation',
    '@opentelemetry/sdk-node',
    'handlebars',
    'twilio'
  ]
};

export default nextConfig;
