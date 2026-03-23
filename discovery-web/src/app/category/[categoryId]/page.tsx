"use client";

import { useParams } from "next/navigation";
import { CategoryDetailPage } from "@/components/CategoryDetailPage";

export default function CategoryDetail() {
  const params = useParams();
  const categoryId = params.categoryId as string;

  return <CategoryDetailPage categoryId={categoryId} />;
}