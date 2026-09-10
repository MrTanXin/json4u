// Copyright 2022-Present loggerhead.
// Modifications Copyright 2026 MrTanXin.
// SPDX-License-Identifier: Apache-2.0
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import ViewSearchInput from "@/components/ui/search/ViewSearchInput";
import { Switch } from "@/components/ui/switch";
import SwapButton from "@/containers/editor/mode/SwapButton";
import { ViewMode } from "@/lib/db/config";
import { useEditorStore } from "@/stores/editorStore";
import { useConfigFromCookies } from "@/stores/hook";
import { useStatusStore } from "@/stores/statusStore";
import { includes } from "lodash-es";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/shallow";
import FullScreenButton from "./FullScreenButton";

export default function RightPanelButtons({ viewMode }: { viewMode: ViewMode }) {
  const cc = useConfigFromCookies();
  const t = useTranslations();
  const runCommand = useEditorStore((state) => state.runCommand);
  const comparer = useEditorStore((state) => state.comparer);
  const { enableTextCompare, setEnableTextCompare } = useStatusStore(
    useShallow((state) => ({
      enableTextCompare: state._hasHydrated ? state.enableTextCompare : cc.enableTextCompare,
      setEnableTextCompare: state.setEnableTextCompare,
    })),
  );
  const hasHydrated = useStatusStore((state) => state._hasHydrated);

  const handleTextCompareChange = (enable: boolean) => {
    setEnableTextCompare(enable);
    if (!enable) {
      comparer?.stop();
    }
  };

  useEffect(() => {
    if (!hasHydrated || !enableTextCompare || !comparer) {
      return;
    }

    void comparer.compare().catch((error) => {
      console.error("[json4u:compare] initial compare failed", error);
    });
  }, [comparer, enableTextCompare, hasHydrated]);

  return (
    <div className="flex items-center pl-2 ml-auto space-x-2">
      {viewMode === ViewMode.Text && (
        <>
          <div className="flex items-center rounded-md pl-1 bg-muted text-zinc-600">
            <Switch checked={enableTextCompare} onCheckedChange={handleTextCompareChange} />
            <Button className="px-2" onClick={() => runCommand("compare")}>
              {t(enableTextCompare ? "TextCompare" : "compare")}
            </Button>
          </div>
          <SwapButton variant="icon-outline" className="px-2" />
        </>
      )}
      {includes<ViewMode>([ViewMode.Graph, ViewMode.Table], viewMode) && <ViewSearchInput />}
      <FullScreenButton />
    </div>
  );
}
