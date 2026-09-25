"use client";

import { useEffect, useState } from "react";
import type { DashboardOverview } from "@/types/api";

export function useDashboardData() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => fetch("/api/dashboard")
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load dashboard data");
        return response.json() as Promise<DashboardOverview>;
      })
      .then((dashboard) => {
        if (!cancelled) setData(dashboard);
      })
      .catch((requestError: Error) => {
        if (!cancelled) setError(requestError.message);
      });

    load();
    const interval = window.setInterval(load, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return { data, error, loading: !data && !error };
}
