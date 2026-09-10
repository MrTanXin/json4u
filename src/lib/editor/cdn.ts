// Copyright 2022-Present loggerhead.
// Modifications Copyright 2026 MrTanXin.
// SPDX-License-Identifier: Apache-2.0
import { env, isCN } from "@/lib/env";

export const monacoVersion = "0.52.2";

// 默认自托管（见 lib/editor/monaco.ts），编辑器随页面 chunk 同源加载。
// 如果不希望自托管的静态资源占用回源带宽，可以设置 NEXT_PUBLIC_MONACO_CDN 切回 CDN：
//   auto       —— 按域名自动选择 bootcdn（.cn）/ cdnjs
//   <完整 URL> —— 指向 vs 目录，如 https://cdn.example.com/monaco-editor/0.52.2/min/vs
const cdnSetting = env.NEXT_PUBLIC_MONACO_CDN?.trim();

function resolveVsURL(): string | undefined {
  if (!cdnSetting) {
    return undefined;
  }
  if (cdnSetting === "auto") {
    const cdnHost = isCN ? "cdn.bootcdn.net" : "cdnjs.cloudflare.com";
    return `https://${cdnHost}/ajax/libs/monaco-editor/${monacoVersion}/min/vs`;
  }
  return cdnSetting.replace(/\/+$/, "");
}

export const vsURL = resolveVsURL();
export const loaderURL = vsURL ? `${vsURL}/loader.js` : undefined;
export const isSelfHostedMonaco = !vsURL;
