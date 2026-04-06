import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Terminal, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import Dashboard from "@/pages/Dashboard";
import Backtest from "@/pages/Backtest";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

function Nav() {
  const [loc] = useLocation();
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  const tabs = [
    { path: "/",         label: "Dashboard",  Icon: Terminal },
    { path: "/backtest", label: "Backtest",   Icon: FlaskConical },
  ];

  return (
    <div className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border/40">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-5 flex gap-1 pt-2">
        {tabs.map(({ path, label, Icon }) => {
          const active = path === "/" ? loc === "/" : loc.startsWith(path);
          return (
            <Link key={path} href={path}
              className={cn(
                "flex items-center gap-1.5 px-3 pb-2 pt-1 text-xs font-mono font-medium border-b-2 transition-all",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Router() {
  return (
    <>
      <Nav />
      <Switch>
        <Route path="/"         component={Dashboard} />
        <Route path="/backtest" component={Backtest} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
