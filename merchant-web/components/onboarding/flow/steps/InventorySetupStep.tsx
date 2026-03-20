import type { MerchantOnboardingDraft } from "../types";

interface Props {
  draft: MerchantOnboardingDraft;
  onChange: (next: MerchantOnboardingDraft) => void;
}

export function InventorySetupStep({ draft, onChange }: Props) {
  return (
    <div className="merchant-onboarding-content">
      <h2>Inventory setup</h2>
      <p>Choose how you want to start adding products.</p>
      <div className="merchant-onboarding-radio-wrap">
        <label className={draft.inventorySetupMode === "manual" ? "active" : ""}>
          <input
            type="radio"
            name="inventory_mode"
            checked={draft.inventorySetupMode === "manual"}
            onChange={() =>
              onChange({ ...draft, inventorySetupMode: "manual" })
            }
          />
          Add products manually
        </label>
        <label className={draft.inventorySetupMode === "import" ? "active" : ""}>
          <input
            type="radio"
            name="inventory_mode"
            checked={draft.inventorySetupMode === "import"}
            onChange={() =>
              onChange({ ...draft, inventorySetupMode: "import" })
            }
          />
          Import inventory from CSV
        </label>
      </div>
      <label>
        Notes
        <textarea
          rows={4}
          value={draft.inventoryNotes}
          onChange={(event) =>
            onChange({ ...draft, inventoryNotes: event.target.value })
          }
          placeholder="Any inventory setup notes for your team"
        />
      </label>
    </div>
  );
}

