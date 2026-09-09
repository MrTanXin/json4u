"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/icons/Logo";
import { Separator } from "@/components/ui/separator";
import { version } from "@/lib/env";
import { cn } from "@/lib/utils";
import { useConfigFromCookies } from "@/stores/hook";
import { useStatusStore } from "@/stores/statusStore";
import {
  ArrowDownNarrowWide,
  Braces,
  Download,
  FileUp,
  CircleHelp,
  Share2,
  SquareStack,
  AlignHorizontalJustifyCenter,
  ArrowLeftToLine,
  ArrowRightFromLine,
  Bug,
  Languages,
  Text,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/shallow";
import Button from "./Button";
import ExportPopover from "./ExportPopover";
import { Label } from "./IconLabel";
import ImportPopover from "./ImportPopover";
import LinkButton from "./LinkButton";
import PopoverBtn, { popoverBtnClass } from "./PopoverButton";
import SharePopover from "./SharePopover";
import Toggle from "./Toggle";

export default function SideNav() {
  const [transition, setTransition] = useState(false);
  useEffect(() => {
    setTransition(true);
  }, []);

  const cc = useConfigFromCookies();
  const t = useTranslations();
  const {
    sideNavExpanded,
    setSideNavExpanded,
    fixSideNav,
    setFixSideNav,
    enableAutoFormat,
    enableAutoSort,
    enableNestParse,
    enableAutoUnescape,
    setEnableAutoUnescape,
    enableAutoUnicode,
    setEnableAutoUnicode,
    setParseOptions,
    enableSyncScroll,
    setEnableSyncScroll,
  } = useStatusStore(
    useShallow((state) => {
      const parseOptions = state._hasHydrated ? state.parseOptions : cc.parseOptions;
      return {
        sideNavExpanded: !!state.sideNavExpanded,
        setSideNavExpanded: state.setSideNavExpanded,
        fixSideNav: state._hasHydrated ? state.fixSideNav : cc.fixSideNav,
        setFixSideNav: state.setFixSideNav,
        enableAutoFormat: !!parseOptions.format,
        enableAutoSort: !!parseOptions.sort,
        enableNestParse: !!parseOptions.nest,
        enableAutoUnescape: state._hasHydrated ? state.enableAutoUnescape : cc.enableAutoUnescape,
        setEnableAutoUnescape: state.setEnableAutoUnescape,
        enableAutoUnicode: state._hasHydrated ? state.enableAutoUnicode : cc.enableAutoUnicode,
        setEnableAutoUnicode: state.setEnableAutoUnicode,
        setParseOptions: state.setParseOptions,
        enableSyncScroll: state._hasHydrated ? state.enableSyncScroll : cc.enableSyncScroll,
        setEnableSyncScroll: state.setEnableSyncScroll,
      };
    }),
  );

  return (
    <div
      className="flex flex-col h-full w-8"
      onMouseEnter={(event) => {
        if (fixSideNav || (event.target as HTMLElement).closest(`.${popoverBtnClass}`)) {
          return;
        }
        setSideNavExpanded(true);
      }}
      onMouseLeave={() => setSideNavExpanded(false)}
    >
      <nav
        className={cn(
          "group z-50 h-full py-1.5 w-8 data-[expanded=true]:w-32 box-content border-r border-default shadow-xl duration-200 hide-scrollbar flex flex-col justify-between bg-background overflow-hidden gap-y-2",
          transition && "transition-width",
        )}
        data-expanded={sideNavExpanded}
      >
        <ul className="relative flex flex-col justify-start px-1 gap-y-1">
          <Link prefetch={false} href="/" className="flex items-center pointer mt-1 mb-2">
            <Logo className="w-6 h-6" />
            <Label title={`v${version}`} />
          </Link>
          <PopoverBtn title={t("Import")} icon={<FileUp className="icon" />} content={<ImportPopover />} />
          <PopoverBtn title={t("Export")} icon={<Download className="icon" />} content={<ExportPopover />} />
          <PopoverBtn
            className="hidden"
            title={t("Share")}
            icon={<Share2 className="icon" />}
            content={<SharePopover />}
          />
          <Separator className="my-1" />
          <Toggle
            icon={<Braces className="icon" />}
            title={t("Auto Format")}
            description={t("auto_format_desc")}
            isPressed={enableAutoFormat}
            onPressedChange={(pressed) => setParseOptions({ format: pressed })}
          />
          <Toggle
            icon={<Text className="icon" />}
            title={t("Auto Unescape")}
            description={t("auto_unescape_desc")}
            isPressed={enableAutoUnescape}
            onPressedChange={(pressed) => setEnableAutoUnescape(pressed)}
          />
          <Toggle
            icon={<Languages className="icon" />}
            title={t("Auto Unicode")}
            description={t("auto_unicode_desc")}
            isPressed={enableAutoUnicode}
            onPressedChange={(pressed) => setEnableAutoUnicode(pressed)}
          />
          <Toggle
            icon={<SquareStack className="icon" />}
            title={t("Nested Parse")}
            description={t("nested_parse_desc")}
            isPressed={enableNestParse}
            onPressedChange={(pressed) => setParseOptions({ nest: pressed })}
          />
          <Toggle
            icon={<ArrowDownNarrowWide className="icon" />}
            title={t("Auto Sort")}
            description={t("auto_sort_desc")}
            isPressed={enableAutoSort}
            onPressedChange={(pressed) => setParseOptions({ sort: pressed ? "asc" : undefined })}
          />
          <Toggle
            icon={<AlignHorizontalJustifyCenter className="icon" />}
            title={t("sync_reveal")}
            description={t("sync_reveal_desc")}
            isPressed={enableSyncScroll}
            onPressedChange={(pressed) => setEnableSyncScroll(pressed)}
          />
        </ul>
        <ul className="flex flex-col px-1 gap-y-2">
          <LinkButton icon={<CircleHelp className="icon" />} title={t("Tutorial")} href={"/tutorial"} newWindow />
          <LinkButton
            icon={<Bug className="icon" />}
            title={t("Feedback")}
            href={"https://github.com/MrTanXin/json4u/issues/new"}
            newWindow
          />
          <Button
            className="my-1.5"
            icon={fixSideNav ? <ArrowRightFromLine className="icon" /> : <ArrowLeftToLine className="icon" />}
            title={t(fixSideNav ? "Expand" : "Collapse")}
            onClick={() => {
              setFixSideNav(!fixSideNav);
              setSideNavExpanded(fixSideNav);
            }}
          />
        </ul>
      </nav>
    </div>
  );
}
