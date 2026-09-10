// Copyright 2022-Present loggerhead.
// Modifications Copyright 2026 MrTanXin.
// SPDX-License-Identifier: Apache-2.0
import type { MonacoApi } from "@/lib/editor/types.d.ts";
import type { MyWorker } from "@/lib/worker/worker";
import type { Remote } from "comlink";
import en from "../messages/en.json";

type Messages = typeof en;
export type MessageKey = MessageKeys<IntlMessages, "">;

declare global {
  // Use type safe message keys with `next-intl`
  interface IntlMessages extends Messages {}

  interface Console {
    l: (...args: any[]) => void;
  }

  interface Window {
    // 自托管 Monaco 时由 lib/editor/monaco.ts 设置，用于指定 json / editor worker 的构造方式。
    MonacoEnvironment?: {
      getWorker: (workerId: string, label: string) => Worker;
    };
    rawWorker: Worker;
    worker: Remote<MyWorker>;
    monacoApi: MonacoApi;
    searchComponents: Record<string, any>;
  }
}

// https://www.webdevluis.com/blog/fix-typescript-cannot-find-module-declaration-error-mdx-react
declare module "*.mdx" {
  let MDXComponent: (props: any) => JSX.Element;
  export default MDXComponent;
}
