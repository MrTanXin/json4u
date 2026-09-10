// Copyright 2022-Present loggerhead.
// Modifications Copyright 2026 MrTanXin.
// SPDX-License-Identifier: Apache-2.0
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
    // 留空则自托管 Monaco；填 "auto" 或 vs 目录的完整 URL 则改为从 CDN 加载。
    NEXT_PUBLIC_MONACO_CDN: z.string().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_MONACO_CDN: process.env.NEXT_PUBLIC_MONACO_CDN,
  },
});

// Is the .cn domain?
export const isCN = true;
export const isDev = process.env.NODE_ENV === "development";
