import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatPanel } from "@/components/chat-panel";
import { AppContextProvider, useAppContext } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Map, Hammer } from "lucide-react";
import Dashboard from "@/pages/dashboard";
import IDEPage from "@/pages/ide";
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

function ModeToggle() {
  const { mode, setMode, setChatMessages } = useAppContext();

  const handleModeChange = (newMode: "plan" | "build") => {
    if (newMode !== mode) {
      setMode(newMode);
      setChatMessages([]);
    }
  };

  return (
    <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
      <Button
        size="sm"
        variant={mode === "plan" ? "default" : "ghost"}
        className="text-xs gap-1.5"
        onClick={() => handleModeChange("plan")}
        data-testid="button-mode-plan"
      >
        <Map className="w-3.5 h-3.5" />
        Plan
      </Button>
      <Button
        size="sm"
        variant={mode === "build" ? "default" : "ghost"}
        className="text-xs gap-1.5"
        onClick={() => handleModeChange("build")}
        data-testid="button-mode-build"
      >
        <Hammer className="w-3.5 h-3.5" />
        Build
      </Button>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/ide" component={IDEPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const isMobile = useIsMobile();
  const [showChat, setShowChat] = useState(true);

  const sidebarStyle = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 px-3 py-1.5 border-b dark:bg-[#141516]">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ModeToggle />
            </div>
            {!isMobile && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => setShowChat(!showChat)}
                data-testid="button-toggle-chat"
              >
                {showChat ? "Hide Chat" : "Show Chat"}
              </Button>
            )}
          </header>
          <div className="flex flex-1 min-h-0">
            <main className="flex-1 min-w-0 overflow-auto">
              <Router />
            </main>
            {showChat && !isMobile && (
              <div className="w-[320px] flex-shrink-0">
                <ChatPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContextProvider>
            <Toaster />
            <AppLayout />
          </AppContextProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
