// 自托管 Monaco：把编辑器打包进构建产物，从同源加载，
// 避免运行时再串行去第三方 CDN 拉 loader.js -> editor.main.js（gzip 后约 700 KB）。
//
// edcore.main 已包含全部编辑器功能（折叠、查找、sticky scroll、hover、inlay hints 等），
// 但不含任何语言支持；语言只按需引入 JSON，省掉 ts/html/css 三个大 worker
// 和 basic-languages 里近百个用不到的语法定义。
import type * as MonacoApi from "monaco-editor/esm/vs/editor/editor.api.d.ts";
// edcore.main 没有随包提供类型声明，但它导出的公开 API 与 editor.api 完全一致。
// @ts-ignore -- untyped esm entry
import * as edcore from "monaco-editor/esm/vs/editor/edcore.main";
import "monaco-editor/esm/vs/language/json/monaco.contribution";

export type Monaco = typeof MonacoApi;

const monaco = edcore as unknown as Monaco;

let initialized = false;

export function setupMonaco(): Monaco {
  if (initialized) {
    return monaco;
  }
  initialized = true;

  window.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === "json") {
        return new Worker(new URL("monaco-editor/esm/vs/language/json/json.worker", import.meta.url));
      }
      return new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker", import.meta.url));
    },
  };

  return monaco;
}
