import { motion } from "framer-motion";
import { Activity, Target } from "lucide-react";
import { useScanner } from "@/hooks/use-kokojambo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ScannerStatus() {
  const { status, isLoading } = useScanner();

  if (isLoading || !status) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-2.5 px-4 flex items-center justify-center">
          <Activity className="w-5 h-5 text-primary animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const isScanning = status.isScanning && !status.isPaused;
  const progress = status.totalTokens ? (status.tokenIndex! / status.totalTokens!) * 100 : 0;

  return (
    <Card className="border-primary/20">
      <CardContent className="py-2.5 px-4 relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-md bg-background border border-border flex-shrink-0">
              <Activity className={`w-4.5 h-4.5 ${isScanning ? "text-primary animate-pulse-fast" : "text-muted-foreground"}`} />
              {isScanning && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-ping" />
              )}
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                SYSTEM SCANNER
                <Badge variant={status.isPaused ? "warning" : "success"} className="font-sans text-xs px-1.5 py-0 h-5">
                  {status.isPaused ? "PAUSED" : "ACTIVE"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-md">
            <div className="flex justify-between items-center mb-1 font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <Target className="w-3 h-3 text-primary" />
                <span className="text-muted-foreground">SCANNING:</span>
                <span className="text-foreground font-bold">{status.currentSymbol || "WAITING"}</span>
              </div>
              <span className="text-muted-foreground text-xs">
                {status.tokenIndex || 0} / {status.totalTokens || 0}
              </span>
            </div>
            <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border/50">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
