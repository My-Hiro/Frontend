"use client";

import { useParams, useSearchParams } from "next/navigation";
import { StorePage } from "@/components/StorePage";

export default function StoreDetail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const storeId = params.storeId as string;
  const entryCategoryId = searchParams.get("category") || undefined;

  return <StorePage storeId={storeId} entryCategoryId={entryCategoryId} />;
}