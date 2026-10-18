import { MetadataRoute } from "next";
import { env } from "@/lib/env";

// https://next-intl-docs.vercel.app/docs/environments/metadata-route-handlers
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    getEntry("/"),
    getEntry("/editor"),
    getEntry("/changelog"),
    getEntry("/terms"),
    getEntry("/privacy"),
    getEntry("/tutorial"),
  ];
}

function getEntry(pathname: string) {
  return {
    url: getUrl(pathname),
    lastModified: new Date(),
  };
}

function getUrl(pathname: string) {
  return `${env.NEXT_PUBLIC_APP_URL}/${pathname.startsWith("/") ? pathname.slice(1) : pathname}`;
}
