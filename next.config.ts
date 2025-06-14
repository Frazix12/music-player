import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "coverartarchive.org",
                port: "",
                pathname: "/**",
            },
        ],
    },
};

export default nextConfig;
