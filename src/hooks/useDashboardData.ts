"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { SalesRecord } from "@/types/dashboard";

type DateRange = { start: string; end: string };

export function useDashboardData() {
  // Date ranges
  const defaultDateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, []);

  const [activeDateRange, setActiveDateRange] = useState<DateRange>(defaultDateRange);

  // Data state
  const [masterData, setMasterData] = useState<SalesRecord[] | null>(null);
  const [previousYearData, setPreviousYearData] = useState<SalesRecord[] | null>(null);
  const [history3yData, setHistory3yData] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Derived date ranges
  const previousYearDateRange = useMemo(() => {
    const startDate = new Date(activeDateRange.start);
    const endDate = new Date(activeDateRange.end);
    startDate.setFullYear(startDate.getFullYear() - 1);
    endDate.setFullYear(endDate.getFullYear() - 1);
    return {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
    };
  }, [activeDateRange]);

  const lookback3y = useMemo(() => {
    const start = new Date(activeDateRange.start);
    const end = new Date(activeDateRange.start);
    start.setFullYear(start.getFullYear() - 3);
    end.setDate(end.getDate() - 1);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, [activeDateRange.start]);

  // Cache helpers
  const getCacheKey = useCallback(
    () => `dashboard_v2_${activeDateRange.start}_${activeDateRange.end}`,
    [activeDateRange]
  );

  const loadFromCache = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(getCacheKey());
      if (!raw) return null;
      return JSON.parse(raw) as {
        master: SalesRecord[];
        previous: SalesRecord[];
        history3y: string[];
      };
    } catch {
      return null;
    }
  }, [getCacheKey]);

  const saveToCache = useCallback(
    (master: SalesRecord[], previous: SalesRecord[], history3y: string[]) => {
      try {
        sessionStorage.setItem(getCacheKey(), JSON.stringify({ master, previous, history3y }));
      } catch { /* storage full — ignore */ }
    },
    [getCacheKey]
  );

  // Data fetching — sequential with progressive rendering
  const fetchDashboardData = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh) {
        const cached = loadFromCache();
        if (cached) {
          setMasterData(cached.master);
          setPreviousYearData(cached.previous);
          setHistory3yData(cached.history3y);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      const noCache = forceRefresh ? "&noCache=1" : "";

      try {
        // 1. Current year summary — user sees KPIs immediately
        const currentRes = await fetch(
          `/api/dashboard-data?startDate=${activeDateRange.start}&endDate=${activeDateRange.end}&mode=summary${noCache}`
        );
        if (!currentRes.ok) {
          const errorData = await currentRes.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${currentRes.status}`);
        }
        const master: SalesRecord[] = await currentRes.json();
        setMasterData(master);

        // 2. Previous year summary — YOY charts appear
        const prevRes = await fetch(
          `/api/dashboard-data?startDate=${previousYearDateRange.start}&endDate=${previousYearDateRange.end}&mode=summary${noCache}`
        );
        const previous: SalesRecord[] = prevRes.ok ? await prevRes.json() : [];
        setPreviousYearData(previous);

        // 3. 3-year lookback customers — new customers list
        const histRes = await fetch(
          `/api/dashboard-data?startDate=${lookback3y.start}&endDate=${lookback3y.end}&mode=customers${noCache}`
        );
        const histBody = histRes.ok ? await histRes.json() : { customers: [] };
        const history3y: string[] = histBody.customers ?? [];
        setHistory3yData(history3y);

        saveToCache(master, previous, history3y);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeDateRange, previousYearDateRange, lookback3y, loadFromCache, saveToCache]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    defaultDateRange,
    activeDateRange,
    setActiveDateRange,
    masterData,
    previousYearData,
    history3yData,
    isLoading,
    error,
    fetchDashboardData,
  };
}
