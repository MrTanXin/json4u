import { loaderURL, vsURL } from "@/lib/editor/cdn";
import { CookiesProvider } from "next-client-cookies/server";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Home" });
  return { title: t("Editor") };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  // 自托管时 monaco 与页面同源，无需额外提示；
  // 走 CDN 时在 HTML 里就把握手做掉，并把 loader.js 提前到解析阶段发出，
  // 否则它要等页面 JS 执行后才开始 DNS + TCP + TLS。
  const cdnOrigin = vsURL ? new URL(vsURL).origin : undefined;

  return (
    <main className="w-screen h-screen">
      {cdnOrigin && (
        <>
          <link rel="preconnect" href={cdnOrigin} crossOrigin="anonymous" />
          <link rel="dns-prefetch" href={cdnOrigin} />
          <link rel="preload" as="script" href={loaderURL} crossOrigin="anonymous" />
        </>
      )}
      <CookiesProvider>{children}</CookiesProvider>
    </main>
  );
}
