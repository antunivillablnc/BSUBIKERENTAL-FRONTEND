import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "res.cloudinary.com",
			},
		],
	},
	async redirects() {
		return [
			{
				source: "/my-bike",
				destination: "/dashboard",
				permanent: true,
			},
		];
	},
};

export default nextConfig;
