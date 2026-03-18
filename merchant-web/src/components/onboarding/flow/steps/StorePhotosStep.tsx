import { useMemo, useState } from "react";
import { ImageCropModal } from "../../../media/ImageCropModal";
import { merchantApi, type MediaUploadPreset } from "../../../../state/api";
import type { MerchantOnboardingDraft } from "../types";

interface Props {
  draft: MerchantOnboardingDraft;
  onChange: (next: MerchantOnboardingDraft) => void;
}

type Target = "logo" | "banner";

const uploadPresetByTarget: Record<Target, MediaUploadPreset> = {
  logo: "store_logo",
  banner: "store_banner"
};

const cropConfigByTarget: Record<Target, { aspect: number; width: number; height: number; title: string }> = {
  logo: {
    aspect: 1,
    width: 512,
    height: 512,
    title: "Adjust store logo"
  },
  banner: {
    aspect: 1440 / 560,
    width: 1440,
    height: 560,
    title: "Adjust store banner"
  }
};

export function StorePhotosStep({ draft, onChange }: Props) {
  const [pendingTarget, setPendingTarget] = useState<Target | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cropConfig = useMemo(
    () => (pendingTarget ? cropConfigByTarget[pendingTarget] : null),
    [pendingTarget]
  );

  const openCrop = (file: File, target: Target) => {
    if (!String(file.type ?? "").toLowerCase().startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError("");
    setPendingTarget(target);
    setPendingFile(file);
  };

  const closeCrop = () => {
    if (busy) return;
    setPendingTarget(null);
    setPendingFile(null);
  };

  const applyCrop = async (blob: Blob) => {
    if (!pendingTarget) return;
    setBusy(true);
    setError("");
    try {
      const uploadFile = new File([blob], `${pendingTarget}-${Date.now()}.webp`, {
        type: "image/webp"
      });
      const url = await merchantApi.uploadMedia(uploadFile, uploadPresetByTarget[pendingTarget]);
      if (pendingTarget === "logo") {
        onChange({ ...draft, logoUrl: url });
      } else {
        onChange({ ...draft, bannerUrl: url });
      }
      setPendingTarget(null);
      setPendingFile(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="merchant-onboarding-content">
      <h2>Store Photos</h2>
      <p>Upload logo and banner visuals. You can zoom and position before saving.</p>

      <div className="merchant-onboarding-preview-grid">
        <div className="merchant-upload-box">
          <small>Store Logo</small>
          <div className="merchant-photo-preview">
            {draft.logoUrl ? (
              <img src={draft.logoUrl} alt="Logo preview" loading="lazy" />
            ) : (
              <span>No logo uploaded</span>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              openCrop(file, "logo");
              event.target.value = "";
            }}
          />
        </div>
        <div className="merchant-upload-box">
          <small>Store Banner</small>
          <div className="merchant-photo-preview merchant-photo-preview-banner">
            {draft.bannerUrl ? (
              <img src={draft.bannerUrl} alt="Banner preview" loading="lazy" />
            ) : (
              <span>No banner uploaded</span>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              openCrop(file, "banner");
              event.target.value = "";
            }}
          />
        </div>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {cropConfig && (
        <ImageCropModal
          open={Boolean(cropConfig)}
          file={pendingFile}
          title={cropConfig.title}
          aspectRatio={cropConfig.aspect}
          outputWidth={cropConfig.width}
          outputHeight={cropConfig.height}
          onCancel={closeCrop}
          onApply={applyCrop}
        />
      )}
    </div>
  );
}
