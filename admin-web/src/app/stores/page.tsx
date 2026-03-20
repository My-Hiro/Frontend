"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Search, 
  Store as StoreIcon, 
  CheckCircle, 
  AlertCircle, 
  MapPin, 
  ExternalLink,
  ShieldCheck,
  FileText,
  Filter
} from "lucide-react";
import { adminApi } from "../../lib/api/admin";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { cn } from "../../lib/utils";

export default function StoresPage() {
  const queryClient = useQueryClient();
  const [storeQuery, setStoreQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "Unverified" | "Verified" | "Partner">("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [submittedOnly, setSubmittedOnly] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState("");

  // Queries
  const storesQuery = useQuery({
    queryKey: ["stores"],
    queryFn: () => adminApi.listStores(),
  });

  const docsQuery = useQuery({
    queryKey: ["store-docs", selectedStoreId],
    queryFn: () => adminApi.listStoreVerificationDocuments(selectedStoreId),
    enabled: !!selectedStoreId,
  });

  // Mutations
  const updateVerificationMutation = useMutation({
    mutationFn: ({ id, verification }: { id: string, verification: string }) =>
      adminApi.updateStoreVerification(id, verification as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stores"] }),
  });

  const updateDocMutation = useMutation({
    mutationFn: ({ id, docId, status }: { id: string, docId: string, status: string }) =>
      adminApi.updateStoreVerificationDocument(id, docId, { status: status as any }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["store-docs", selectedStoreId] }),
  });

  const stores = storesQuery.data?.rows ?? [];

  const filteredStores = useMemo(() => {
    const q = storeQuery.trim().toLowerCase();
    return stores.filter((row) => {
      if (q && !row.store_name.toLowerCase().includes(q) && !row.store_id.toLowerCase().includes(q)) return false;
      if (verificationFilter !== "all" && row.verification !== verificationFilter) return false;
      if (flaggedOnly && row.open_reports === 0) return false;
      if (submittedOnly && !row.verification_submitted) return false;
      return true;
    });
  }, [stores, storeQuery, flaggedOnly, submittedOnly, verificationFilter]);

  const verificationQueue = stores.filter((row) => row.verification === "Unverified" && row.verification_submitted);
  const flaggedStores = stores.filter((row) => row.open_reports > 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title="Store Management" 
        description="Verify merchants, monitor status, and review business credentials."
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Merchants" value={stores.length} icon={<StoreIcon size={18} />} />
        <StatCard title="Awaiting Verification" value={verificationQueue.length} className="bg-blue-50/50 border-blue-100" icon={<ShieldCheck size={18} className="text-blue-600" />} />
        <StatCard title="Reported Stores" value={flaggedStores.length} className="bg-destructive/5 border-destructive/10" icon={<AlertCircle size={18} className="text-destructive" />} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-card border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="font-bold text-lg">Merchant Registry</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <input 
                    placeholder="Search by store name..." 
                    value={storeQuery}
                    onChange={(e) => setStoreQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-background border rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none w-[200px]"
                  />
                </div>
                <select 
                  value={verificationFilter} 
                  onChange={(e) => setVerificationFilter(e.target.value as any)}
                  className="bg-background border rounded-lg text-xs font-bold py-2 px-3 focus:ring-0 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Unverified">Unverified</option>
                  <option value="Verified">Verified</option>
                  <option value="Partner">Partner</option>
                </select>
              </div>
            </div>

            <div className="table-wrap">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/5 border-b">
                    <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-wider">Store Info</th>
                    <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-wider">Verification</th>
                    <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-wider">Region</th>
                    <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredStores.map((row) => (
                    <tr key={row.store_id} className={cn("hover:bg-muted/10 transition-colors", selectedStoreId === row.store_id && "bg-primary/5")}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm">{row.store_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{row.store_id}</div>
                      </td>
                      <td className="px-6 py-4">
                         <span className={cn(
                           "px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1",
                           row.verification === "Verified" ? "bg-green-100 text-green-700" :
                           row.verification === "Partner" ? "bg-purple-100 text-purple-700" : "bg-muted text-muted-foreground"
                         )}>
                            {row.verification === "Verified" && <ShieldCheck size={10} />}
                            {row.verification.toUpperCase()}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <MapPin size={10} />
                          {row.city}, {row.region}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button 
                          onClick={() => setSelectedStoreId(row.store_id)}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 ml-auto"
                         >
                            Review Docs <ExternalLink size={10} />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <section className="bg-card border rounded-2xl shadow-sm overflow-hidden sticky top-24">
            <div className="p-6 border-b bg-muted/20">
              <h3 className="font-bold text-lg">Verification Portal</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedStoreId ? `Reviewing ${stores.find(s => s.store_id === selectedStoreId)?.store_name}` : "Select a store to review documents"}
              </p>
            </div>
            
            <div className="p-6">
              {!selectedStoreId ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                   <div className="p-3 rounded-full bg-secondary text-muted-foreground/40">
                      <FileText size={32} />
                   </div>
                   <p className="text-sm font-medium text-muted-foreground">No merchant selected</p>
                </div>
              ) : (
                <div className="space-y-6">
                   <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submitted Documents</h4>
                      {(docsQuery.data?.rows ?? []).length === 0 && !docsQuery.isLoading && (
                        <p className="text-xs italic text-muted-foreground">No documents uploaded for this store.</p>
                      )}
                      <div className="space-y-2">
                        {(docsQuery.data?.rows ?? []).map((doc) => (
                          <div key={doc.id} className="p-3 border rounded-lg bg-background flex items-center justify-between group">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold">{doc.label}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{doc.status}</p>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                onClick={() => updateDocMutation.mutate({ id: selectedStoreId, docId: doc.id, status: "approved" })}
                                className="h-7 w-7 rounded bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200 transition-colors"
                               >
                                  <CheckCircle size={14} />
                               </button>
                               <button 
                                onClick={() => updateDocMutation.mutate({ id: selectedStoreId, docId: doc.id, status: "rejected" })}
                                className="h-7 w-7 rounded bg-red-100 text-red-700 flex items-center justify-center hover:bg-red-200 transition-colors"
                               >
                                  <AlertCircle size={14} />
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="pt-4 border-t space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Promotion Authority</h4>
                      <div className="grid grid-cols-2 gap-2">
                         <button 
                          onClick={() => updateVerificationMutation.mutate({ id: selectedStoreId, verification: "Verified" })}
                          className="py-2 rounded-lg border-2 border-green-600/20 text-green-700 text-xs font-bold hover:bg-green-50 transition-colors"
                         >
                            Verify Standard
                         </button>
                         <button 
                          onClick={() => updateVerificationMutation.mutate({ id: selectedStoreId, verification: "Partner" })}
                          className="py-2 rounded-lg border-2 border-purple-600/20 text-purple-700 text-xs font-bold hover:bg-purple-50 transition-colors"
                         >
                            Grant Partner
                         </button>
                      </div>
                      <button 
                        onClick={() => updateVerificationMutation.mutate({ id: selectedStoreId, verification: "Unverified" })}
                        className="w-full py-2 rounded-lg bg-secondary text-muted-foreground text-xs font-bold hover:bg-secondary/80 transition-colors"
                      >
                         Revoke Verification
                      </button>
                   </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
