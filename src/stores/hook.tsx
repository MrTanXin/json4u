"use client";

import { type Config, defaultConfig } from "@/lib/db/config";
import { tryCatch } from "@/lib/utils";
import { useCookies } from "next-client-cookies";

// Copyright 2022-Present loggerhead.
// Modifications Copyright 2026 MrTanXin.
// SPDX-License-Identifier: Apache-2.0

export function useConfigFromCookies() {
  const cookies = useCookies();
  return tryCatch<Config>(() => {
    const state = (JSON.parse(cookies.get("config")!)["state"] ?? {}) as Partial<Config>;
    return {
      ...defaultConfig,
      ...state,
      parseOptions: { ...defaultConfig.parseOptions, ...(state.parseOptions ?? {}) },
    };
  }, defaultConfig);
}
