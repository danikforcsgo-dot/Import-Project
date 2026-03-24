import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Session {
  name: string;
  nameRu: string;
  start: number;
  end: number;
}

const SESSIONS: Session[] = [
  { name: "Asia",   nameRu: "Азия",   start: 0,  end: 9  },
  { name: "Europe", nameRu: "Европа", start: 7,  end: 16 },
  { name: "USA",    nameRu: "США",    start: 13, end: 22 },
];

function getActiveSession(utcHour: number): string | null {
  for (const s of SESSIONS) {
    if (utcHour >= s.start && utcHour < s.end) return s.name;
  }
  return null;
}

function formatTime(d: Date): string {
  return [
    String(d.getUTCHours()).padStart(2, "0"),
    String(d.getUTCMinutes()).padStart(2, "0"),
    String(d.getUTCSeconds()).padStart(2, "0"),
  ].join(":");
}

export function MarketsPanel() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const utcHour = now.getUTCHours();
  const activeSession = getActiveSession(utcHour);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="text-sm font-mono uppercase tracking-widest flex items-center justify-between text-muted-foreground">
          <span className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Рынки
          </span>
          <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
            {formatTime(now)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 flex flex-col gap-2.5">
        {activeSession && (
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Активно: <span className="text-primary font-bold">{SESSIONS.find(s => s.name === activeSession)?.nameRu}</span>
          </div>
        )}

        {SESSIONS.map((session) => {
          const isActive = activeSession === session.name;
          return (
            <div
              key={session.name}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg border transition-all",
                isActive
                  ? "border-primary/40 bg-primary/10"
                  : "border-border/30 bg-background/40 opacity-50"
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full flex-shrink-0",
                  isActive ? "bg-primary" : "bg-muted-foreground/30"
                )} />
                <span className="font-mono text-base font-semibold">{session.nameRu}</span>
              </div>
              <span className="font-mono text-sm text-muted-foreground tabular-nums">
                {String(session.start).padStart(2, "0")}–{String(session.end).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
