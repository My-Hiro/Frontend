import { useEffect, useMemo, useState } from "react";
import type { Category, StoreProfile } from "@/types";
import { storeService } from "@/lib/api/store.service";
import { OnboardingLayout } from "./OnboardingLayout";
import { type OnboardingStepMeta } from "./Stepper";
import { Button } from "@/components/ui/button";
import {
  applyOnboardingDraftToProfile,
  createOnboardingDraft,
  type MerchantOnboardingDraft
} from "./types";
import { FinishStep } from "./steps/FinishStep";
import { InventorySetupStep } from "./steps/InventorySetupStep";
import { LocationStep } from "./steps/LocationStep";
import { OpenHoursStep } from "./steps/OpenHoursStep";
import { BusinessVerificationStep } from "./steps/BusinessVerificationStep";
import { StoreInfoStep } from "./steps/StoreInfoStep";
import { StorePhotosStep } from "./steps/StorePhotosStep";

export const ONBOARDING_DRAFT_KEY_PREFIX = "merchant_onboarding_draft_v1";
export const ONBOARDING_DONE_KEY_PREFIX = "merchant_onboarding_done_v1";
export const ONBOARDING_REQUIRED_KEY_PREFIX = "merchant_onboarding_required_v1";

export const onboardingDraftKeyFor = (scope: string): string =>
  `${ONBOARDING_DRAFT_KEY_PREFIX}:${scope}`;

export const onboardingDoneKeyFor = (scope: string): string =>
  `${ONBOARDING_DONE_KEY_PREFIX}:${scope}`;

export const onboardingRequiredKeyFor = (scope: string): string =>
  `${ONBOARDING_REQUIRED_KEY_PREFIX}:${scope}`;

const steps: OnboardingStepMeta[] = [
  { id: "store-info", label: "Store Info" },
  { id: "open-hours", label: "Open Hours" },
  { id: "store-photos", label: "Store Photos" },
  { id: "location", label: "Location" },
  { id: "inventory-setup", label: "Inventory" },
  { id: "business-verification", label: "Verify" },
  { id: "finish", label: "Finish" }
];

interface Props {
  storageScope: string;
  storeProfile: StoreProfile;
  categories: Category[];
  onSave: (next: StoreProfile) => Promise<void>;
  onComplete: () => void;
}

export function OnboardingFlow({
  storageScope,
  storeProfile,
  categories,
  onSave,
  onComplete
}: Props) {
  const draftStorageKey = onboardingDraftKeyFor(storageScope);
  const doneStorageKey = onboardingDoneKeyFor(storageScope);
  const requiredStorageKey = onboardingRequiredKeyFor(storageScope);

  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<MerchantOnboardingDraft>(() => {
    const stored = readStoredDraft(draftStorageKey);
    return stored ?? createOnboardingDraft(storeProfile, categories);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const stored = readStoredDraft(draftStorageKey);
    if (stored) {
      setDraft(stored);
      return;
    }
    const nextDefault = createOnboardingDraft(storeProfile, categories);
    setDraft((current) => ({
      ...nextDefault,
      ...current,
      categories:
        current.categories.length > 0 ? current.categories : nextDefault.categories
    }));
  }, [storeProfile, categories, draftStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [draft, draftStorageKey]);

  const canProceed = useMemo(() => {
    if (stepIndex === 0) {
      return (
        draft.storeName.trim().length > 1 &&
        draft.contactPhone.trim().length >= 8 &&
        draft.address.trim().length > 3 &&
        draft.categories.length > 0
      );
    }
    if (stepIndex === 3) {
      return Number.isFinite(draft.lat) && Number.isFinite(draft.lng);
    }
    return true;
  }, [stepIndex, draft]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported on this device.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((current) => ({
          ...current,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Could not capture current location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const finish = async () => {
    setSaving(true);
    setError("");
    try {
      const nextProfile = applyOnboardingDraftToProfile(storeProfile, draft);
      await onSave(nextProfile);
      const verificationUploads = [
        {
          url: draft.verificationNationalIdUrl,
          docType: "national_id" as const,
          label: "National ID Card / Passport"
        },
        {
          url: draft.verificationBusinessDocUrl,
          docType: "business_document" as const,
          label: "Business Registration Certificate"
        },
        {
          url: draft.verificationOtherDocUrl,
          docType: "other" as const,
          label: "Other Verification Document"
        }
      ].filter((entry) => Boolean(entry.url));

      for (const upload of verificationUploads) {
        await storeService.uploadVerificationDocument(storeProfile.storeId, {
          docType: upload.docType,
          label: upload.label,
          fileUrl: String(upload.url)
        });
      }
      if (verificationUploads.length > 0 && !draft.verificationSkipped) {
        await storeService.submitVerificationDocuments(storeProfile.storeId);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(doneStorageKey, "1");
        localStorage.removeItem(requiredStorageKey);
        localStorage.removeItem(draftStorageKey);
      }
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not finish onboarding.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      title="Let's set up your store"
      subtitle="Complete these steps to get your merchant account ready."
      steps={steps}
      currentStep={stepIndex}
    >
      <div className="space-y-6 min-h-[400px]">
        {stepIndex === 0 && (
          <StoreInfoStep
            draft={draft}
            categories={categories}
            onChange={setDraft}
          />
        )}
        {stepIndex === 1 && <OpenHoursStep draft={draft} onChange={setDraft} />}
        {stepIndex === 2 && <StorePhotosStep draft={draft} onChange={setDraft} />}
        {stepIndex === 3 && (
          <LocationStep
            draft={draft}
            locating={locating}
            onUseCurrentLocation={useCurrentLocation}
            onChange={setDraft}
          />
        )}
        {stepIndex === 4 && (
          <InventorySetupStep draft={draft} onChange={setDraft} />
        )}
        {stepIndex === 5 && (
          <BusinessVerificationStep draft={draft} onChange={setDraft} />
        )}
        {stepIndex === 6 && <FinishStep draft={draft} categories={categories} />}

        {error && <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
      </div>

      <footer className="mt-10 pt-6 border-t flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
          disabled={saving || stepIndex === 0}
        >
          Back
        </Button>
        {stepIndex < steps.length - 1 ? (
          <Button
            onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}
            disabled={!canProceed || saving}
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={() => void finish()}
            disabled={saving}
          >
            {saving ? "Saving..." : "Finish setup"}
          </Button>
        )}
      </footer>
    </OnboardingLayout>
  );
}

const readStoredDraft = (draftKey: string): MerchantOnboardingDraft | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return null;
    return JSON.parse(raw) as MerchantOnboardingDraft;
  } catch {
    return null;
  }
};
