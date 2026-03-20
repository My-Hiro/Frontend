"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../lib/api/admin";
import { useRangeInput } from "../../store/useSharedInputs";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { 
  Heart, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  Building2,
  Calendar,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { cn } from "../../lib/utils";

export default function MerchantHealthPage() {
  const rangeInput = useRangeInput();

  const merchantHealthQuery = useQuery({
    queryKey: ["merchant-health", rangeInput],
    queryFn: () => adminApi.getMerchantHealth(rangeInput),
  });

  const merchantHealth = merchantHealthQuery.data ?? [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title="Merchant Health" 
        description="Verify inventory update compliance and verify operational verification status."
      />

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Health Index" value="98.2%" icon={<Heart size={18} />} trend={{ value: 1.2, isUp: true }} />
        <StatCard title="Active Updates" value={merchantHealth.length.toLocaleString()} icon={<RefreshCw size={18} />} />
        <StatCard title="Compliant Status" value="84%" icon={<ShieldCheck size={18} />} />
        <StatCard title="Avg Update Cycle" value="4.2h" icon={<Clock size={18} />} trend={{ value: 0.5, isUp: false }} />
      </section>

      <section className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <Building2 size={20} />
             </div>
             <h3 className="font-bold text-lg">Merchant Operational Status</h3>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-background border rounded-lg">
             <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live Oversight Active</span>
          </div>
        </div>

        <div className="table-wrap">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/5 border-b">
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider">Merchant Store</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-center">Compliance Status</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-center">Total Syncs</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-center">Stale Syncs</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-right">Last Interaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {merchantHealth.map((row) => (
                <tr key={row.store_id} className="hover:bg-muted/10 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          {row.store_name.substring(0, 2).toUpperCase()}
                       </div>
                       <div>
                          <div className="font-bold text-sm leading-none">{row.store_name}</div>
                          <div className="text-[10px] text-muted-foreground mt-1 font-medium">{row.verification} Level</div>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight",
                      row.stale_updates > 0 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                    )}>
                      {row.stale_updates > 0 ? "Warning" : "Compliant"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-bold font-mono">{row.updates.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                       {row.stale_updates > 0 && <AlertTriangle size={12} className="text-yellow-600" />}
                       <span className={cn("text-xs font-bold font-mono", row.stale_updates > 0 ? "text-yellow-600" : "text-muted-foreground")}>
                          {row.stale_updates.toLocaleString()}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                       <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Calendar size={12} className="opacity-50" />
                          {new Date(row.last_inventory_update).toLocaleDateString()}
                       </div>
                       <div className="text-[10px] text-muted-foreground/60 mt-1">
                          {new Date(row.last_inventory_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!merchantHealthQuery.isLoading && merchantHealth.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                     <div className="flex flex-col items-center gap-3 grayscale opacity-50">
                        <Building2 size={48} />
                        <p className="text-sm font-medium italic">No operational data available for this range.</p>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
