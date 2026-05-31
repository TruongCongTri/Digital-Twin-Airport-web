const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  output: "standalone",
  swcMinify: false,
  skipLibCheck: true,
};

export default nextConfig;
