"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Portal } from "@radix-ui/react-popover";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

const options = [
  { value: "light", label: "LightTheme", Icon: Sun },
  { value: "dark", label: "DarkTheme", Icon: Moon },
  { value: "system", label: "SystemTheme", Icon: Monitor },
] as const;

export default function ThemePicker({ sidebar = false }: { sidebar?: boolean }) {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size={sidebar ? "xs" : "sm"}
          className={cn("shrink-0 px-1.5", sidebar ? "w-6" : "h-9 w-9")}
          aria-label={t("Theme")}
          title={t("Theme")}
        >
          <Sun className="icon dark:hidden" aria-hidden />
          <Moon className="icon hidden dark:block" aria-hidden />
        </Button>
      </PopoverTrigger>
      <Portal>
        <PopoverContent
          aria-label={t("Theme")}
          side={sidebar ? "right" : "bottom"}
          align={sidebar ? "end" : "center"}
          className="grid w-40 gap-1 p-1"
        >
          {options.map(({ value, label, Icon }) => (
            <Button
              key={value}
              type="button"
              className="justify-start gap-2 text-foreground"
              aria-pressed={theme === value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
            >
              <Icon className="icon" aria-hidden />
              {t(label)}
              {theme === value && <Check className="icon ml-auto" aria-hidden />}
            </Button>
          ))}
        </PopoverContent>
      </Portal>
    </Popover>
  );
}
