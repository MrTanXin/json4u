"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import Loading from "@/components/Loading";
import { isSelfHostedMonaco, vsURL } from "@/lib/editor/cdn";
import { EditorWrapper, type Kind } from "@/lib/editor/editor";
import { useEditor, useEditorStore } from "@/stores/editorStore";
import { useStatusStore } from "@/stores/statusStore";
import { loader, Editor as MonacoEditor } from "@monaco-editor/react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/shallow";
import { example } from "./data";
import { getInitialJSONFromSearch } from "./url";

// Copyright 2022-Present loggerhead.
// Modifications Copyright 2026 MrTanXin.
// SPDX-License-Identifier: Apache-2.0

// 自托管时把打包好的 monaco 实例直接交给 loader，跳过 AMD 加载器和跨域往返；
// 只有显式配置了 NEXT_PUBLIC_MONACO_CDN 才回退到 CDN 的 paths 方式。
let monacoReady: Promise<void> | null = null;

function ensureMonaco(): Promise<void> {
  if (!monacoReady) {
    monacoReady = import("@/lib/editor/monaco").then(({ setupMonaco }) => {
      loader.config({ monaco: setupMonaco() });
    });
  }
  return monacoReady;
}

if (isSelfHostedMonaco) {
  // 在浏览器端模块求值时就开始下载 monaco chunk，与 React 渲染并行，而不是等到组件挂载。
  if (typeof window !== "undefined") {
    ensureMonaco();
  }
} else {
  loader.config({ paths: { vs: vsURL! } });
}

interface EditorProps extends ComponentPropsWithoutRef<typeof MonacoEditor> {
  kind: Kind;
}

export default function Editor({ kind, ...props }: EditorProps) {
  const translations = useTranslations();
  const setEditor = useEditorStore((state) => state.setEditor);
  const setTranslations = useEditorStore((state) => state.setTranslations);
  const loaderConfigured = useMonacoLoader();

  useDisplayExample(kind);
  useRevealNode(kind);
  useEditTree(kind);

  // loader.config 必须先于任何编辑器挂载完成，否则 @monaco-editor/react 会用默认的 CDN 配置。
  if (!loaderConfigured) {
    return <Loading />;
  }

  return (
    <MonacoEditor
      language="json"
      loading={<Loading />}
      options={{
        fontSize: 13, // 设置初始字体大小
        scrollBeyondLastLine: false, // 行数超过一屏时才展示滚动条
        automaticLayout: true, // 当编辑器所在的父容器的大小改变时，编辑器会自动重新计算并调整大小
        wordWrap: "on",
        minimap: { enabled: false },
        stickyScroll: {
          enabled: true,
          defaultModel: "foldingProviderModel",
        },
      }}
      onMount={(editor, monaco) => {
        if (!window.monacoApi) {
          window.monacoApi = {
            Raw: monaco,
            KeyCode: monaco.KeyCode,
            MinimapPosition: monaco.editor.MinimapPosition,
            OverviewRulerLane: monaco.editor.OverviewRulerLane,
            Range: monaco.Range,
            RangeFromPositions: monaco.Range.fromPositions,
          };
        }
        // used for e2e tests.
        window.monacoApi[kind] = editor;

        const wrapper = new EditorWrapper(editor, kind);
        wrapper.init();
        setEditor(wrapper);
        setTranslations(translations);
        console.l(`finished initial editor ${kind}:`, wrapper);
      }}
      {...props}
    />
  );
}

// 等待自托管的 monaco chunk 就绪；使用 CDN 时无需等待。
function useMonacoLoader() {
  const [ready, setReady] = useState(!isSelfHostedMonaco);

  useEffect(() => {
    if (ready) {
      return;
    }

    let alive = true;
    ensureMonaco().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [ready]);

  return ready;
}

// reveal position in text
export function useRevealNode(kind: Kind) {
  const editor = useEditor("main");
  const { isNeedReveal, revealPosition } = useStatusStore(
    useShallow((state) => ({
      isNeedReveal: state.isNeedReveal("editor"),
      revealPosition: state.revealPosition,
    })),
  );

  useEffect(() => {
    const { treeNodeId, target } = revealPosition;

    if (kind === "main" && editor && isNeedReveal && treeNodeId) {
      editor.setNodeSelection(treeNodeId, target);
    }
  }, [editor, revealPosition, isNeedReveal]);
}

export function useEditTree(kind: Kind) {
  const editor = useEditor("main");
  const { editQueue, clearEditQueue } = useStatusStore(
    useShallow((state) => ({
      editQueue: state.editQueue,
      clearEditQueue: state.clearEditQueue,
    })),
  );

  useEffect(() => {
    if (kind === "main" && editor && editQueue.length > 0) {
      editor.applyTreeEdits(editQueue);
      clearEditQueue();
    }
  }, [editor, editQueue]);
}

function useDisplayExample(kind: Kind) {
  const editor = useEditor("main");
  const incrEditorInitCount = useStatusStore((state) => state.incrEditorInitCount);
  const didSetInitialText = useRef(false);

  useEffect(() => {
    if (kind !== "main" || !editor || didSetInitialText.current) {
      return;
    }

    const initialJSON = getInitialJSONFromSearch(window.location.search);
    const initialText = initialJSON ?? (incrEditorInitCount() <= 1 ? example : undefined);

    if (initialText === undefined) {
      return;
    }

    didSetInitialText.current = true;
    editor.parseAndSet(initialText);
  }, [editor]);
}
