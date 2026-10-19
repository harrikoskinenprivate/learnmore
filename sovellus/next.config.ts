import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cloud Run -kuva käynnistää .next/standalone/server.js. Paikallinen npm run dev ei muutu.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
