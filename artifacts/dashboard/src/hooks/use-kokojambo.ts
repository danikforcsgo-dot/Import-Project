import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import {
  useGetScannerStatus,
  useUpdateScannerStatus,
  useGetSignals,
  useGetLiveTrading,
  useToggleLiveTrading,
} from "@workspace/api-client-react";

export function useScanner() {
  const queryClient = useQueryClient();
  
  const { data: status, isLoading } = useGetScannerStatus({
    query: { refetchInterval: 5000 },
  });

  const { mutate: updateStatus, isPending: isUpdating } = useUpdateScannerStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/scanner/status"] });
      },
    },
  });

  const togglePause = () => {
    if (!status) return;
    updateStatus({ data: { ...status, isPaused: !status.isPaused } });
  };

  return { status, isLoading, togglePause, isUpdating };
}

export function useLiveState() {
  return useGetLiveTrading({ query: { refetchInterval: 10000 } });
}

export function useBingxBalance() {
  return useQuery({
    queryKey: ["/api/live-trading/balance"],
    queryFn: async () => {
      const res = await fetch("/api/live-trading/balance");
      return res.json() as Promise<{ balance: number | null; error?: string }>;
    },
    refetchInterval: 30000,
  });
}

export function useLiveControls() {
  const queryClient = useQueryClient();

  const toggleLive = useToggleLiveTrading({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/live-trading"] }),
    },
  });

  const closePositionMutation = useMutation({
    mutationFn: async (token?: string) => {
      const res = await fetch("/api/live-trading/close-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token } : {}),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to close position");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/live-trading"] });
      queryClient.invalidateQueries({ queryKey: ["/api/live-trading/balance"] });
    },
  });

  return { toggleLive, closePositionMutation };
}

export function useSignalsFeed() {
  return useGetSignals(
    { limit: 50 },
    { query: { refetchInterval: 15000 } }
  );
}

export function usePositionPnl(enabled: boolean) {
  return useQuery({
    queryKey: ["/api/live-trading/position-pnl"],
    queryFn: async () => {
      const res = await fetch("/api/live-trading/position-pnl");
      return res.json() as Promise<{ unrealizedProfit?: number; currentPrice?: number; symbol?: string; noPosition?: boolean }>;
    },
    refetchInterval: 15000,
    enabled,
  });
}

export function useClearTelegramMessages() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/telegram/clear-messages", { method: "POST" });
      const data = await res.json() as { success?: boolean; deleted?: number; failed?: number; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to clear messages");
      return data;
    },
  });
}

export function useReconcilePositions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/live-trading/reconcile", { method: "POST" });
      const data = await res.json() as { success?: boolean; before?: number; after?: number; removed?: number; bxOpen?: number; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to reconcile");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/live-trading"] });
      queryClient.invalidateQueries({ queryKey: ["/api/live-trading/balance"] });
    },
  });
}

export function useSleepMode() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["/api/scanner/sleep"],
    queryFn: async () => {
      const res = await fetch("/api/scanner/sleep");
      return res.json() as Promise<{ isSleepMode: boolean }>;
    },
    refetchInterval: 10000,
  });

  const toggle = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch("/api/scanner/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      return res.json() as Promise<{ success: boolean; sleepMode: boolean }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scanner/sleep"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scanner/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/live-trading"] });
    },
  });

  return { isSleepMode: data?.isSleepMode ?? false, toggle };
}
