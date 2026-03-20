"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../lib/api/admin";
import { useRangeInput } from "../../store/useSharedInputs";
import { ImageCropModal } from "../../components/media/ImageCropModal";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { 
  Megaphone, 
  MousePointer2, 
  PhoneCall, 
  Navigation, 
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Upload,
  AlertCircle
} from "lucide-react";
import { cn } from "../../lib/utils";

const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;

type AdLinkType = "none" | "custom_url" | "discovery_page" | "discovery_store" | "discovery_product" | "merchant_page";
type AdPlacement = "homepage_hero" | "store_profile" | "product_page" | "store_page" | "merchant_support";

export default function AdsPage() {
  const rangeInput = useRangeInput();
  const queryClient = useQueryClient();

  // Local State for Forms
  const [newAdTitle, setNewAdTitle] = useState("");
  const [newAdSubtitle, setNewAdSubtitle] = useState("");
  const [newAdImageUrl, setNewAdImageUrl] = useState("");
  const [newAdLinkType, setNewAdLinkType] = useState<AdLinkType>("none");
  const [newAdLinkTarget, setNewAdLinkTarget] = useState("");
  const [adLinkTargetSearch, setAdLinkTargetSearch] = useState("");
  const [newAdPlacement, setNewAdPlacement] = useState<AdPlacement>("homepage_hero");
  const [newAdPriority, setNewAdPriority] = useState(100);
  const [adUploading, setAdUploading] = useState(false);
  const [pendingAdFile, setPendingAdFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  // Queries
  const adsOverviewQuery = useQuery({
    queryKey: ["ads-overview", rangeInput],
    queryFn: () => adminApi.getAds(rangeInput),
  });

  const adPlacementsQuery = useQuery({
    queryKey: ["ad-placements"],
    queryFn: () => adminApi.listAdPlacements(),
  });

  const adLinkTargetType = useMemo(() => {
    if (newAdLinkType === "discovery_store") return "store";
    if (newAdLinkType === "discovery_product") return "product";
    return null;
  }, [newAdLinkType]);

  const adLinkTargetsQuery = useQuery({
    queryKey: ["ad-link-targets", adLinkTargetType, adLinkTargetSearch],
    queryFn: () => adminApi.listSponsorshipTargets({
      type: adLinkTargetType as "store" | "product",
      q: adLinkTargetSearch.trim() || undefined
    }),
    enabled: !!adLinkTargetType,
  });

  // Mutations
  const createAdMutation = useMutation({
    mutationFn: (data: any) => adminApi.createAdPlacement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-placements"] });
      queryClient.invalidateQueries({ queryKey: ["ads-overview"] });
      setNewAdTitle("");
      setNewAdSubtitle("");
      setNewAdImageUrl("");
      setNewAdLinkType("none");
      setNewAdLinkTarget("");
      setAdLinkTargetSearch("");
      setNewAdPriority(100);
    },
    onError: (err: Error) => setError(err.message),
  });

  const uploadAdImageMutation = useMutation({
    mutationFn: (file: File) => adminApi.uploadAdImage(file, { preset: "ad_banner" }),
    onSuccess: (url) => {
      setNewAdImageUrl(url);
      setAdUploading(false);
      setPendingAdFile(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setAdUploading(false);
      setPendingAdFile(null);
    },
  });

  const handleCreateAd = () => {
    if (!newAdTitle.trim() || !newAdImageUrl.trim()) {
      setError("Ad title and image URL are required.");
      return;
    }
    createAdMutation.mutate({
      title: newAdTitle.trim(),
      subtitle: newAdSubtitle.trim() || undefined,
      image_url: newAdImageUrl.trim(),
      link_type: newAdLinkType,
      link_target: newAdLinkType === "none" ? undefined : newAdLinkTarget.trim(),
      link_url: newAdLinkType === "custom_url" && newAdLinkTarget.trim() ? newAdLinkTarget.trim() : undefined,
      placements: [newAdPlacement],
      priority: newAdPriority,
      active: true
    });
  };

  const applyAdCrop = async (blob: Blob) => {
    setAdUploading(true);
    setError("");
    const file = new File([blob], `ad-banner-${Date.now()}.webp`, { type: "image/webp" });
    uploadAdImageMutation.mutate(file);
  };

  const ads = adsOverviewQuery.data;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title="Ad Placements" 
        description="Monitor ad performance and deploy new display banners."
      />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-center gap-3 text-destructive font-bold text-sm">
           <AlertCircle size={18} />
           {error}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Impressions" value={ads?.impressions?.toLocaleString() ?? "0"} icon={<ImageIcon size={18} />} />
        <StatCard title="Avg Click Rate" value={ads ? formatPercent(ads.ctr) : "0%"} icon={<MousePointer2 size={18} />} />
        <StatCard title="Call Conversion" value={ads?.calls?.toLocaleString() ?? "0"} icon={<PhoneCall size={18} />} />
        <StatCard title="Direction Leads" value={ads?.directions?.toLocaleString() ?? "0"} icon={<Navigation size={18} />} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-12 xl:col-span-8 bg-card border rounded-2xl shadow-sm overflow-hidden h-fit">
           <div className="p-6 border-b bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="bg-primary/10 p-2 rounded-lg text-primary">
                    <Plus size={20} />
                 </div>
                 <h3 className="font-bold text-lg leading-none">Create Dynamic Banner</h3>
              </div>
           </div>
           
           <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Title</label>
                  <input 
                    value={newAdTitle} 
                    onChange={(e) => setNewAdTitle(e.target.value)} 
                    placeholder="e.g. Summer Mega Sale" 
                    className="w-full px-4 py-2.5 bg-background border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Subtitle</label>
                  <input 
                    value={newAdSubtitle} 
                    onChange={(e) => setNewAdSubtitle(e.target.value)} 
                    placeholder="e.g. Up to 50% off select brands" 
                    className="w-full px-4 py-2.5 bg-background border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1 text-primary flex items-center gap-1.5">
                    <LinkIcon size={12} /> Link Behavior
                  </label>
                  <select
                    value={newAdLinkType}
                    onChange={(e) => setNewAdLinkType(e.target.value as AdLinkType)}
                    className="w-full px-4 py-2.5 bg-background border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                  >
                    <option value="none">Static (No Link)</option>
                    <option value="discovery_page">Discovery Page</option>
                    <option value="discovery_store">Internal Store</option>
                    <option value="discovery_product">Internal Product</option>
                    <option value="merchant_page">Merchant Portal</option>
                    <option value="custom_url">External URL</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Placement Slot</label>
                  <select
                    value={newAdPlacement}
                    onChange={(e) => setNewAdPlacement(e.target.value as AdPlacement)}
                    className="w-full px-4 py-2.5 bg-background border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                  >
                    <option value="homepage_hero">Homepage Hero</option>
                    <option value="store_profile">Store Profile</option>
                    <option value="product_page">Product Details</option>
                    <option value="store_page">Store Sidebar</option>
                    <option value="merchant_support">Support Center</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Display Priority</label>
                  <input
                    type="number"
                    value={newAdPriority}
                    onChange={(e) => setNewAdPriority(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-background border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              {adLinkTargetType && (
                <div className="p-4 bg-muted/30 border border-dashed rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-300">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Find {adLinkTargetType}</label>
                        <div className="relative">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={14} />
                           <input
                            value={adLinkTargetSearch}
                            onChange={(e) => setAdLinkTargetSearch(e.target.value)}
                            placeholder={`Search ${adLinkTargetType} by name...`}
                            className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary/50 outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Selected Target</label>
                        <select
                          value={newAdLinkTarget}
                          onChange={(e) => setNewAdLinkTarget(e.target.value)}
                          className="w-full px-3 py-2 bg-background border rounded-lg text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="">Choose target...</option>
                          {(adLinkTargetsQuery.data?.rows ?? []).map((entry) => (
                            <option key={entry.id} value={entry.id}>{entry.label}</option>
                          ))}
                        </select>
                      </div>
                   </div>
                </div>
              )}

              <div className="pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4">
                    <label className="group cursor-pointer flex items-center gap-2 bg-secondary/50 hover:bg-secondary transition-colors px-4 py-2.5 rounded-xl border border-dashed">
                       <Upload size={16} className="text-primary group-hover:scale-110 transition-transform" />
                       <span className="text-sm font-bold text-muted-foreground">{newAdImageUrl ? "Replace Asset" : "Select Image"}</span>
                       <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setPendingAdFile(file);
                        }}
                      />
                    </label>
                    {newAdImageUrl && <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[150px]">{newAdImageUrl}</span>}
                 </div>

                 <button 
                  onClick={handleCreateAd}
                  disabled={createAdMutation.isPending || adUploading}
                  className="w-full md:w-auto px-10 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                 >
                    {createAdMutation.isPending ? "Deploying..." : "Deploy Placement"}
                 </button>
              </div>
           </div>
        </section>

        <section className="lg:col-span-12 xl:col-span-4 space-y-8 h-fit">
           <div className="bg-card border rounded-2xl shadow-sm p-8 space-y-6">
              <div className="space-y-1">
                 <h3 className="font-bold text-lg">Visual Asset</h3>
                 <p className="text-xs text-muted-foreground italic">Current placement preview</p>
              </div>
              <div className="aspect-video bg-muted/40 rounded-xl overflow-hidden border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center text-muted-foreground space-y-2">
                 {newAdImageUrl ? (
                    <img src={newAdImageUrl} className="w-full h-full object-cover" alt="Ad Preview" />
                 ) : (
                   <>
                    <ImageIcon size={32} className="opacity-20" />
                    <span className="text-xs font-medium">No image deployed yet</span>
                   </>
                 )}
              </div>
              <div className="p-4 bg-primary/5 rounded-xl space-y-2">
                 <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Sizing Guidelines</h4>
                 <p className="text-[11px] leading-relaxed text-muted-foreground">
                   Standard hero banners should be <span className="font-bold text-foreground">1440x560px</span> for optimal high-DPI rendering. PNG or WebP preferred.
                 </p>
              </div>
           </div>
        </section>
      </div>

      {pendingAdFile && (
        <ImageCropModal
          open={Boolean(pendingAdFile)}
          file={pendingAdFile}
          title="Optimal Banner Calibration"
          aspectRatio={1440 / 560}
          outputWidth={1440}
          outputHeight={560}
          onCancel={() => setPendingAdFile(null)}
          onApply={applyAdCrop}
        />
      )}
    </div>
  );
}
