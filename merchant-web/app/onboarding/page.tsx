'use client';

import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingFlow } from "@/components/onboarding/flow/OnboardingFlow";
import { useStoreProfile } from "@/hooks/useStoreProfile";
import { useCategories } from "@/hooks/useCategories";

export default function OnboardingPage() {
  const { session, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const storeId = "store-main-001";
  const { profile, updateProfile } = useStoreProfile(storeId);
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/login");
    }
  }, [session, authLoading, router]);

  if (authLoading || !session || !profile) return null;

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="mx-auto max-w-5xl py-8 px-4">
        <OnboardingFlow
          storageScope={session.user.id}
          storeProfile={profile}
          categories={categories}
          onSave={async (p) => { await updateProfile(p); }}
          onComplete={() => router.push("/")}
        />
      </div>
    </div>
  );
}
