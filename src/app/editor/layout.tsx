// Copyright 2022-Present loggerhead.
// Modifications Copyright 2026 MrTanXin.
// SPDX-License-Identifier: Apache-2.0
import { loaderURL, vsURL } from "@/lib/editor/cdn";
import { CookiesProvider } from "next-client-cookies/server";
import { getLocale, getTranslations } from "next-intl/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

let monacoPreloads: Promise<string[]> | undefined;

function getMonacoPreloads() {
  // Next's production manifest lists the hashed assets for the client import.
  // Using it keeps the preload URLs in sync with Webpack after each build.
  monacoPreloads ??= readFile(path.join(process.cwd(), ".next", "react-loadable-manifest.json"), "utf8")
    .then((content) => {
      const manifest = JSON.parse(content) as Record<string, { files: string[] }>;
      const entry = Object.entries(manifest).find(([key]) => key.endsWith(" -> @/lib/editor/monaco"));
      const assetPrefix = (process.env.NEXT_PUBLIC_ASSET_PREFIX || "").replace(/\/+$/, "");
      return (entry?.[1].files ?? [])
        .filter((file) => file.startsWith("static/chunks/") && file.endsWith(".js"))
        .map((file) => `${assetPrefix}/_next/${file}`);
    })
    .catch((error: unknown) => {
      console.warn("Could not read Monaco preload assets", error);
      return [];
    });
  return monacoPreloads;
}

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Home" });
  return { title: t("Editor") };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Start requesting the editor assets while the browser reads the HTML.
  const cdnOrigin = vsURL ? new URL(vsURL).origin : undefined;
  const preloadURLs = !cdnOrigin && process.env.NODE_ENV === "production" ? await getMonacoPreloads() : [];

  return (
    <main className="w-screen h-screen">
      {cdnOrigin && (
        <>
          <link rel="preconnect" href={cdnOrigin} crossOrigin="anonymous" />
          <link rel="dns-prefetch" href={cdnOrigin} />
          <link rel="preload" as="script" href={loaderURL} crossOrigin="anonymous" />
        </>
      )}
      {preloadURLs.map((url) => (
        <link key={url} rel="preload" as="script" href={url} />
      ))}
      <CookiesProvider>{children}</CookiesProvider>
    </main>
  );
}
