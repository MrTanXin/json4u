import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainPanel from "@/containers/editor/panels/MainPanel";
import SideNav from "@/containers/editor/sidenav";

export default async function Page() {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full w-full flex-col">
        <div className="flex min-h-0 flex-1">
          <SideNav />
          <Separator orientation="vertical" />
          <MainPanel />
        </div>
      </div>
    </TooltipProvider>
  );
}
