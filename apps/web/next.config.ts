import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactStrictMode: true,
	transpilePackages: ["@smart-bursary/shared-types", "@smart-bursary/ui"],
	typedRoutes: true,
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "*.amazonaws.com",
			},
			{
				protocol: "https",
				hostname: "*.cloudfront.net",
			},
		],
	},
};

export default nextConfig;
