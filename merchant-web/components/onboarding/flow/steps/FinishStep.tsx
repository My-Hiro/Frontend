import type { Category } from "../../../../state/types";
import type { MerchantOnboardingDraft } from "../types";

interface Props {
  draft: MerchantOnboardingDraft;
  categories: Category[];
}

export function FinishStep({ draft, categories }: Props) {
  const categoryNameById = new Map(
    categories.map((entry) => [entry.id, entry.name] as const)
  );
  return (
    <div className="merchant-onboarding-content">
      <h2>Review and finish</h2>
      <p>Confirm details before opening your merchant workspace.</p>
      <div className="merchant-onboarding-summary">
        <div className="line-item">
          <span>Store</span>
          <strong>{draft.storeName || "Not set"}</strong>
        </div>
        <div className="line-item">
          <span>Categories</span>
          <strong>
            {draft.categories.length > 0
              ? draft.categories
                  .map((entry) => categoryNameById.get(entry) ?? entry)
                  .join(", ")
              : "Not set"}
          </strong>
        </div>
        <div className="line-item">
          <span>Contact</span>
          <strong>{draft.contactPhone || draft.contactEmail || "Not set"}</strong>
        </div>
        <div className="line-item">
          <span>Address</span>
          <strong>{draft.address || "Not set"}</strong>
        </div>
        <div className="line-item">
          <span>Coordinates</span>
          <strong>
            {Number.isFinite(draft.lat) && Number.isFinite(draft.lng)
              ? `${Number(draft.lat).toFixed(5)}, ${Number(draft.lng).toFixed(5)}`
              : "Not set"}
          </strong>
        </div>
        <div className="line-item">
          <span>Inventory setup</span>
          <strong>
            {draft.inventorySetupMode === "import"
              ? "Import from CSV"
              : "Manual product setup"}
          </strong>
        </div>
        <div className="line-item">
          <span>Verification</span>
          <strong>
            {draft.verificationSkipped
              ? "Skipped for now"
              : draft.verificationNationalIdUrl || draft.verificationBusinessDocUrl
                ? "Documents uploaded"
                : "No documents uploaded"}
          </strong>
        </div>
      </div>
    </div>
  );
}
