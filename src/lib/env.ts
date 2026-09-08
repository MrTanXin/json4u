import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import packageJSON from "../../package.json";

export const version = packageJSON.version;
export const majorVersion = packageJSON.version.split(".").slice(0, 2).join(".");

// https://env.t3.gg/docs/nextjs
export const env = createEnv({
  server: {},
  client: {
    NEXT_PUBLIC_APP_URL: z.string().regex(/https?:\/\/(\w+\.)+\w+(:\d+)?/g),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});

// Is the .cn domain?
export const isCN = true;
export const isDev = process.env.NODE_ENV === "development";
