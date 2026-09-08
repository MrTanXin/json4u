import NextBundleAnalyzer from "@next/bundle-analyzer";
import createMDX from "@next/mdx";
import createJiti from "jiti";
import createNextIntlPlugin from "next-intl/plugin";
import { fileURLToPath } from "node:url";
import path from "path";

// TODO: After the stable version of Million Lint is released, consider using it to further enhance performance.
// Currently, there are bugs in it that can cause the popover component not work.

// validate environment variables during build
const jiti = createJiti(fileURLToPath(import.meta.url));
jiti("./src/lib/env");

const isCN = /\.cn(:3000)?$/.test(process.env.NEXT_PUBLIC_APP_URL);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
  // not affect auto batching, but it may cause console.log output three times: https://github.com/facebook/react/issues/24570
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  // 部署流水线不重复跑类型/lint 检查（CI 单独有 lint 步骤），避免构建被非致命问题阻塞
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  productionBrowserSourceMaps: false,
  output: "standalone",
  // 自托管 Monaco 后 /_next/static 体积明显变大，全部由源站发既占带宽也容易被刷。
  // 配置 NEXT_PUBLIC_ASSET_PREFIX 指向 CDN 域名后，静态资源只回源一次，之后走边缘缓存。
  // 留空则维持现状（由 Next 自身分发）。
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  experimental: {
    // 单 worker 构建：显著降低内存峰值，使 2C/2G 小机器也能完成构建
    cpus: 1,
    workerThreads: false,
    optimizePackageImports: [
      "react-use",
      "@next/mdx",
      "lodash-es",
      "lucide-react",
      "@xyflow/react",
      "zod",
      "usehooks-ts",
    ],
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = { fs: false };
      config.resolve.alias = {
        ...config.resolve.alias,
        "@": __dirname,
      };
      config.output.webassemblyModuleFilename = "static/wasm/[modulehash].wasm";
      // can't use experiments
      // config.experiments = { asyncWebAssembly: true };
    }

    return config;
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.tsx");
const withMDX = createMDX({});
const withBundleAnalyzer = NextBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const config = withBundleAnalyzer(withNextIntl(withMDX(nextConfig)));

export default config;
