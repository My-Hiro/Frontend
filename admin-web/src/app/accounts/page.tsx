"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Search, 
  UserPlus, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  Calendar,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  Filter
} from "lucide-react";
import { adminApi } from "../../lib/api/admin";
import { useRangeInput } from "../../store/useSharedInputs";
import { PageHeader } from "../../components/layout/PageHeader";
import { cn } from "../../lib/utils";

type PlatformFilter = "all" | "merchant" | "discovery" | "admin";
type StatusFilter = "all" | "active" | "disabled" | "deleted";

export default function AccountsPage() {
  const rangeInput = useRangeInput();
  const queryClient = useQueryClient();
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const accountsQuery = useQuery({
    queryKey: ["accounts", platformFilter, statusFilter, query],
    queryFn: () => adminApi.listAccounts({
      platform: platformFilter === "all" ? undefined : platformFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      q: query.trim() || undefined
    }),
  });

  const signupsQuery = useQuery({
    queryKey: ["signups", rangeInput, platformFilter],
    queryFn: () => adminApi.listSignups({
      platform: platformFilter === "all" ? undefined : platformFilter,
      start: rangeInput.start,
      end: rangeInput.end
    }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: StatusFilter }) =>
      adminApi.updateAccountStatus(id, status as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const accounts = accountsQuery.data?.rows ?? [];
  const signups = signupsQuery.data?.rows ?? [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title="Account Control" 
        description="Moderate and manage user access across all platforms."
        actions={
          <button className="bg-primary text-primary-foreground h-9 px-4 rounded-md text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
            <UserPlus size={14} /> Create Admin
          </button>
        }
      />

      <section className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <Shield size={20} />
             </div>
             <div>
                <h3 className="font-bold text-lg leading-none">Registered Accounts</h3>
                <p className="text-xs text-muted-foreground mt-1">{accounts.length} total users match filters</p>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <input 
                placeholder="Search by email, phone..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-background border rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none w-[240px] transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-background border rounded-lg px-2">
              <Filter size={12} className="text-muted-foreground ml-1" />
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as PlatformFilter)}
                className="bg-transparent border-none text-[11px] font-bold py-2 focus:ring-0 cursor-pointer"
              >
                <option value="all">Platforms: All</option>
                <option value="merchant">Merchant</option>
                <option value="discovery">Discovery</option>
                <option value="admin">Admin</option>
              </select>
              <div className="h-4 w-px bg-border" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="bg-transparent border-none text-[11px] font-bold py-2 focus:ring-0 cursor-pointer"
              >
                <option value="all">Statuses: All</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/10 border-b">
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider">Account Identity</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider">Platform</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-center">Security Status</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider">Registration</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {accounts.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <Mail size={12} className="text-muted-foreground" />
                        {row.email || "No Email Provided"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <Phone size={12} className="opacity-50" />
                        {row.phone_e164 || "No Phone"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight",
                      row.platform === "admin" ? "bg-purple-100 text-purple-700" :
                      row.platform === "merchant" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {row.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5",
                      row.status === "active" ? "bg-green-100 text-green-700" :
                      row.status === "disabled" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                    )}>
                      <div className={cn("h-1.5 w-1.5 rounded-full", row.status === "active" ? "bg-green-500" : row.status === "disabled" ? "bg-yellow-500" : "bg-red-500")} />
                      {row.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Calendar size={12} className="opacity-50" />
                      {new Date(row.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        title="Activate"
                        onClick={() => updateStatusMutation.mutate({ id: row.id, status: "active" })}
                        className="p-2 rounded-md hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-all"
                      >
                        <UserCheck size={16} />
                      </button>
                      <button 
                        title="Disable"
                        onClick={() => updateStatusMutation.mutate({ id: row.id, status: "disabled" })}
                        className="p-2 rounded-md hover:bg-yellow-50 text-muted-foreground hover:text-yellow-600 transition-all"
                      >
                        <UserX size={16} />
                      </button>
                      <button 
                        title="Delete"
                        onClick={() => updateStatusMutation.mutate({ id: row.id, status: "deleted" })}
                        className="p-2 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!accountsQuery.isLoading && accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                       <UserX size={40} className="text-muted-foreground/20" />
                       <div className="max-w-[200px]">
                          <p className="font-bold text-sm">No matching accounts</p>
                          <p className="text-xs text-muted-foreground mt-1">Adjust your filters or try a different search term.</p>
                       </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
           <h3 className="font-bold text-lg leading-none">Recent Growth Pipeline</h3>
           <p className="text-xs text-muted-foreground mt-1">First-time signups in the selected period.</p>
        </div>
        <div className="table-wrap">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/5 border-b">
                <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-wider">Identity</th>
                <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-wider">Source Platform</th>
                <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-wider">Signup Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {signups.map((row) => (
                <tr key={`signup-${row.id}`} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium">{row.email || row.phone_e164 || "Anonymous"}</td>
                  <td className="px-6 py-3">
                    <span className="text-xs font-bold text-muted-foreground border px-2 py-0.5 rounded capitalize">
                      {row.platform}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!signupsQuery.isLoading && signups.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-xs text-muted-foreground italic">
                    No new signups detected in this range.
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
