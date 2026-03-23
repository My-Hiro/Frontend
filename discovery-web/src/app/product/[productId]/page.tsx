"use client";

import { useParams } from "next/navigation";
import { ProductDetailPage } from "@/components/ProductDetailPage";

export default function ProductDetail() {
  const params = useParams();
  const productId = params.productId as string;

  return <ProductDetailPage productId={productId} />;
}