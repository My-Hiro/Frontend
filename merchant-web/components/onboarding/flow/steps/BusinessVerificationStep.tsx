import { useState } from "react";
import { mediaService } from "../../../../api/media.service";
import type { MerchantOnboardingDraft } from "../types";

interface Props {
  draft: MerchantOnboardingDraft;
  onChange: (next: MerchantOnboardingDraft) => void;
}

export function BusinessVerificationStep({ draft, onChange }: Props) {
  const [busyField, setBusyField] = useState<"" | "id" | "business" | "other">("");
  const [error, setError] = useState("");

  const upload = async (
    file: File,
    field: "verificationNationalIdUrl" | "verificationBusinessDocUrl" | "verificationOtherDocUrl",
    busy: "id" | "business" | "other"
  ) => {
    setBusyField(busy);
    setError("");
    try {
      const url = await mediaService.uploadMedia(file, "verification_document");
      onChange({
        ...draft,
        [field]: url,
        verificationSkipped: false
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Document upload failed.");
    } finally {
      setBusyField("");
    }
  };

  return (
    <div className="merchant-onboarding-content">
      <h2>Business Verification</h2>
      <p>Upload business documents to verify your store identity. You can skip and finish later.</p>

      <div className="merchant-verification-note">
        <h4>Why do we need this?</h4>
        <p>
          To comply with local regulations and prevent fraud, we verify legitimate stores.
          Documents are only used for verification.
        </p>
      </div>

      <label>
        National ID Number / TIN
        <input
          value={draft.verificationTin}
          onChange={(event) => onChange({ ...draft, verificationTin: event.target.value })}
          placeholder="Enter ID or Tax Identification Number"
        />
      </label>

      <div className="merchant-verification-grid">
        <label className="merchant-upload-tile">
          <strong>National ID Card / Passport</strong>
          <small>Upload a clear picture or PDF.</small>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void upload(file, "verificationNationalIdUrl", "id");
              event.target.value = "";
            }}
          />
          {busyField === "id" && <small>Uploading...</small>}
          {draft.verificationNationalIdUrl && <small className="success-text">Uploaded</small>}
        </label>

        <label className="merchant-upload-tile">
          <strong>Business Registration Certificate</strong>
          <small>Upload certificate of incorporation or business registration.</small>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void upload(file, "verificationBusinessDocUrl", "business");
              event.target.value = "";
            }}
          />
          {busyField === "business" && <small>Uploading...</small>}
          {draft.verificationBusinessDocUrl && <small className="success-text">Uploaded</small>}
        </label>

        <label className="merchant-upload-tile">
          <strong>Other Documents (Optional)</strong>
          <small>Any relevant licenses or additional documents.</small>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void upload(file, "verificationOtherDocUrl", "other");
              event.target.value = "";
            }}
          />
          {busyField === "other" && <small>Uploading...</small>}
          {draft.verificationOtherDocUrl && <small className="success-text">Uploaded</small>}
        </label>
      </div>

      <label className="merchant-hours-check">
        <input
          type="checkbox"
          checked={Boolean(draft.verificationSkipped)}
          onChange={(event) =>
            onChange({ ...draft, verificationSkipped: event.target.checked })
          }
        />
        Skip for now
      </label>

      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}
