import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow Google account avatars (lh3.googleusercontent.com) rendered by next/image.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  output: 'standalone',
  webpack: (config, {dev}) => {
    if (dev) {
      if (process.env.DISABLE_HMR === 'true') {
        // HMR fully disabled to prevent flickering during agent edits.
        config.watchOptions = { ignored: /.*/ };
      } else {
        // Ignore Windows system files at drive root that cause EINVAL lstat
        // errors ("Watchpack Error: invalid argument, lstat 'C:\pagefile.sys'")
        // alongside the usual heavy build artefact dirs.
        // RegExp ignores match against the FULL absolute path, so they also
        // cover the drive root (C:\pagefile.sys) that webpack scans while
        // walking up ancestor directories for config files.
        config.watchOptions = {
          ignored: [
            "**/node_modules/**",
            "**/.git/**",
            "**/.next/**",
            "**/pagefile.sys",
            "**/hiberfil.sys",
            "**/swapfile.sys",
            "**/System Volume Information/**",
          ],
        };
      }
    }
    return config;
  },
};

export default nextConfig;
