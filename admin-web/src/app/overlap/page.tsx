"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../lib/api/admin";
import { useRangeInput } from "../../store/useSharedInputs";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { 
  History, 
  Zap, 
  Search, 
  AlertTriangle, 
  ArrowRightLeft,
  Clock
} from "lucide-react";
import { cn } from "../../lib/utils";

const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;

export default function OverlapPage() {
  const rangeInput = useRangeInput();

  const overlapQuery = useQuery({
    queryKey: ["overlap", rangeInput],
    queryFn: () => adminApi.getOverlap(rangeInput),
  });

  const missedDemandQuery = useQuery({
    queryKey: ["missed-demand", rangeInput],
    queryFn: () => adminApi.getMissedDemand(rangeInput),
  });

  const overlap = overlapQuery.data;
  const missedDemand = missedDemandQuery.data ?? [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title="Inventory Overlap" 
        description="Monitor synchronization lag and inventory-to-discovery mismatches."
      />

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Sync Events" value={overlap?.total_events?.toLocaleString() ?? "0"} icon={<ArrowRightLeft size={18} />} />
        <StatCard title="Sync Lag (Avg)" value={overlap ? `${Math.round(overlap.freshness_lag_avg_ms / 1000)}s` : "0s"} icon={<Clock size={18} />} />
        <StatCard title="Mismatch Rate" value={overlap ? formatPercent(overlap.mismatch_rate) : "0%"} icon={<AlertTriangle size={18} />} />
        <StatCard title="Stale Merchants" value={overlap?.stale_update_merchants?.length ?? "0"} icon={<Zap size={18} />} className="bg-orange-50/50 border-orange-100" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-12 xl:col-span-8 bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <Search size={20} />
               </div>
               <h3 className="font-bold text-lg leading-none">Missed Demand Queries</h3>
            </div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-background border px-2 py-1 rounded">
               Top results
            </div>
          </div>
          <div className="table-wrap">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/5 border-b">
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider">Search Term</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-right">Occurrence Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {missedDemand.map((row) => (
                  <tr key={row.query} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-semibold text-sm">{row.query}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs font-bold">{row.count.toLocaleString()}</td>
                  </tr>
                ))}
                {!missedDemandQuery.isLoading && missedDemand.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-24 text-center text-muted-foreground italic">
                      All demands are currently being met by inventory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-12 xl:col-span-4 space-y-6">
           <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-lg shadow-primary/20 relative overflow-hidden">
              <History className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 rotate-12" />
              <h4 className="font-bold text-lg">Freshness SLA</h4>
              <p className="text-xs opacity-80 mt-2 leading-relaxed">
                Platform target for inventory propagation is under 10 seconds. Merchants exceeding this threshold are flagged for background sync optimization.
              </p>
              <div className="mt-6 p-3 bg-white/10 rounded-xl border border-white/10">
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Current Health</span>
                    <span className="text-xl font-bold">94.2%</span>
                 </div>
                 <div className="mt-2 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-[94.2%]" />
                 </div>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
}
