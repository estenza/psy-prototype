import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.vnutri.live",
          },
        ],
        destination: "https://vnutri.live/:path*",
        permanent: true,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
