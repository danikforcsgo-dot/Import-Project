import { format } from "date-fns";
import { useSignalsFeed } from "@/hooks/use-kokojambo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Send } from "lucide-react";

export function SignalsTable() {
  const { data: signals = [], isLoading } = useSignalsFeed();

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
          <History className="w-5 h-5 text-primary" />
          SIGNAL HISTORY
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono text-left">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="py-3 px-4 font-sans text-xs uppercase font-semibold">Time</th>
                <th className="py-3 px-4 font-sans text-xs uppercase font-semibold">Symbol</th>
                <th className="py-3 px-4 font-sans text-xs uppercase font-semibold">Type</th>
                <th className="py-3 px-4 font-sans text-xs uppercase font-semibold text-right">Price</th>
                <th className="py-3 px-4 font-sans text-xs uppercase font-semibold text-right">TP</th>
                <th className="py-3 px-4 font-sans text-xs uppercase font-semibold text-right">SL</th>
                <th className="py-3 px-4 font-sans text-xs uppercase font-semibold text-center">Indicators</th>
                <th className="py-3 px-4 font-sans text-xs uppercase font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground animate-pulse">
                    Loading signal feed...
                  </td>
                </tr>
              ) : signals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No signals generated yet.
                  </td>
                </tr>
              ) : (
                signals.map((sig) => (
                  <tr key={sig.id} className="border-b border-border/20 hover:bg-background/50 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground">
                      {format(new Date(sig.createdAt), "HH:mm:ss dd.MM")}
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground">
                      {sig.symbol.replace("/USDT:USDT", "")}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={sig.signalType === "BUY" ? "success" : "destructive"}>
                        {sig.signalType === "BUY" ? "LONG" : "SHORT"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">${sig.price.toFixed(4)}</td>
                    <td className="py-3 px-4 text-right text-success/80">${sig.tp?.toFixed(4)}</td>
                    <td className="py-3 px-4 text-right text-danger/80">${sig.sl?.toFixed(4)}</td>
                    <td className="py-3 px-4 text-center text-xs text-muted-foreground">
                      ADX: {sig.adx?.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sig.sentToTelegram ? (
                        <Send className="w-4 h-4 text-primary mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
