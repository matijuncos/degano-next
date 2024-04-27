/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
          {
            source: "/login",
            headers: [
              {
                key: "Cross-Origin-Embedder-Policy",
                value: "unsafe-none",
              },
            ],
          },
        ];
      },
};

export default nextConfig;
