'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { DealHeaderRecord } from '@my-app/types';
import { WorkerAnalyticsResult } from '../workers/dealsAnalyticsWorker';

export function useDealsWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, { resolve: (data: any) => void; reject: (err: any) => void }>>(
    new Map()
  );
  const [isWorkerReady, setIsWorkerReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Initialize web worker
      const worker = new Worker(new URL('../workers/dealsAnalyticsWorker.ts', import.meta.url));

      worker.onmessage = (event: MessageEvent) => {
        const { id, success, data, error } = event.data;
        const request = pendingRequests.current.get(id);

        if (request) {
          pendingRequests.current.delete(id);
          if (success) {
            request.resolve(data);
          } else {
            request.reject(new Error(error));
          }
        }
      };

      worker.onerror = (err) => {
        console.warn('Worker error encountered, fallback to main thread processing', err);
      };

      workerRef.current = worker;
      setIsWorkerReady(true);
    } catch (e) {
      console.warn('Web Workers unavailable in current environment, using fallback', e);
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const computeAnalyticsAsync = useCallback(
    async (deals: DealHeaderRecord[]): Promise<WorkerAnalyticsResult | null> => {
      if (!deals || deals.length === 0) return null;

      // Offload to Web Worker if ready
      if (workerRef.current && isWorkerReady) {
        return new Promise((resolve, reject) => {
          const id = `analytics_${Date.now()}_${Math.random()}`;
          pendingRequests.current.set(id, { resolve, reject });
          workerRef.current?.postMessage({
            id,
            type: 'COMPUTE_ANALYTICS',
            payload: { deals },
          });
        });
      }

      // Fallback calculation on main thread if worker is unavailable
      return null;
    },
    [isWorkerReady]
  );

  const filterDealsAsync = useCallback(
    async (deals: DealHeaderRecord[], query: string): Promise<DealHeaderRecord[]> => {
      if (!deals) return [];
      if (!query || !query.trim()) return deals;

      if (workerRef.current && isWorkerReady) {
        return new Promise((resolve, reject) => {
          const id = `filter_${Date.now()}_${Math.random()}`;
          pendingRequests.current.set(id, { resolve, reject });
          workerRef.current?.postMessage({
            id,
            type: 'FILTER_DEALS',
            payload: { deals, query },
          });
        });
      }

      // Synchronous fallback
      const q = query.toLowerCase().trim();
      return deals.filter((d) => {
        const reg = (d.dealRegID || '').toLowerCase();
        const cust = (d.custName || '').toLowerCase();
        const proj = (d.ProjectName || d.projectName || '').toLowerCase();
        const brand = (d.brand || '').toLowerCase();
        const bu = (d.BU || d.bu || '').toLowerCase();
        const ao = (d.AssignedAO || d.assignedAO || '').toLowerCase();
        const rem = (d.remarks || '').toLowerCase();

        return (
          reg.includes(q) ||
          cust.includes(q) ||
          proj.includes(q) ||
          brand.includes(q) ||
          bu.includes(q) ||
          ao.includes(q) ||
          rem.includes(q)
        );
      });
    },
    [isWorkerReady]
  );

  return {
    isWorkerReady,
    computeAnalyticsAsync,
    filterDealsAsync,
  };
}
