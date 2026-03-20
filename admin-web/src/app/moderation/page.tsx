"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ShieldAlert, 
  Flag, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ChevronRight,
  MoreHorizontal,
  History
} from "lucide-react";
import { adminApi } from "../../lib/api/admin";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { cn } from "../../lib/utils";

export default function ModerationPage() {
  const queryClient = useQueryClient();
  const [abuseStatus, setAbuseStatus] = useState<"all" | "open" | "resolved">("open");

  const moderationQuery = useQuery({
    queryKey: ["moderation-overview"],
    queryFn: () => adminApi.getModerationOverview(),
  });

  const abuseReportsQuery = useQuery({
    queryKey: ["abuse-reports", abuseStatus],
    queryFn: () => adminApi.listAbuseReports(abuseStatus === "all" ? undefined : abuseStatus),
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) =>
      adminApi.updateAbuseReport(id, status as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["abuse-reports"] }),
  });

  const moderation = moderationQuery.data;
  const reports = abuseReportsQuery.data?.rows ?? [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title="Moderation Center" 
        description="Address abuse reports, monitor suspicious listings, and enforce community standards."
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Abuse Reports" value={moderation?.abuse_reports_open ?? "0"} icon={<Flag size={18} />} className="bg-destructive/5 border-destructive/10" />
        <StatCard title="Suspicious Activity" value={moderation?.suspicious_listings ?? "0"} icon={<AlertTriangle size={18} />} />
        <StatCard title="Awaiting Review" value={moderation?.verification_queue ?? "0"} icon={<Clock size={18} />} />
      </section>

      <section className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-destructive/10 p-2 rounded-lg text-destructive">
                <ShieldAlert size={20} />
             </div>
             <h3 className="font-bold text-lg">Inbound Reports</h3>
          </div>
          <div className="flex items-center gap-2 bg-background border rounded-lg px-1 py-1">
             <button 
              onClick={() => setAbuseStatus("open")}
              className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", abuseStatus === "open" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary")}
             >
                Open
             </button>
             <button 
              onClick={() => setAbuseStatus("resolved")}
              className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", abuseStatus === "resolved" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary")}
             >
                Resolved
             </button>
          </div>
        </div>

        <div className="divide-y divide-border/50">
          {reports.map((row) => (
            <div key={row.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-muted/10 transition-colors group">
               <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1 h-10 w-10 shrink-0 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                     <Flag size={20} />
                  </div>
                  <div className="space-y-1">
                     <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{row.store_name}</span>
                        <ChevronRight size={14} className="text-muted-foreground/40" />
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-tighter bg-secondary px-1.5 py-0.5 rounded">
                          {row.reason}
                        </span>
                     </div>
                     <p className="text-xs text-muted-foreground max-w-2xl line-clamp-2 italic">
                        "{row.details || "No specific details provided for this report."}"
                     </p>
                     <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                           <Clock size={10} />
                           {new Date(row.created_at).toLocaleString()}
                        </div>
                        <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest",
                          row.status === "open" ? "text-destructive" : "text-green-600"
                        )}>
                           Status: {row.status}
                        </span>
                     </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => updateReportMutation.mutate({ id: row.id, status: row.status === "open" ? "resolved" : "open" })}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm",
                      row.status === "open" ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                     {row.status === "open" ? "Mark as Resolved" : "Re-open Case"}
                  </button>
                  <button className="p-2 rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">
                     <MoreHorizontal size={16} />
                  </button>
               </div>
            </div>
          ))}
          
          {reports.length === 0 && !abuseReportsQuery.isLoading && (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
               <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                  <CheckCircle2 size={32} />
               </div>
               <div>
                  <h4 className="font-bold">Queue is Clean</h4>
                  <p className="text-sm text-muted-foreground mt-1">No active reports match this filter. Excellent work!</p>
               </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
