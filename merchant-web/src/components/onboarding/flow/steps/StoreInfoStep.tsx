import type { Category } from "../../../../state/types";
import type { MerchantOnboardingDraft } from "../types";
import { GHANA_REGIONS } from "../../../../constants/ghanaRegions";

interface Props {
  draft: MerchantOnboardingDraft;
  categories: Category[];
  onChange: (next: MerchantOnboardingDraft) => void;
}

const storeTypes = [
  "Retail Store",
  "Provision Shop",
  "Supermarket",
  "Pharmacy",
  "Auto Parts",
  "Electronics"
];

export function StoreInfoStep({ draft, categories, onChange }: Props) {
  const toggleCategory = (id: string) => {
    const nextCategories = draft.categories.includes(id)
      ? draft.categories.filter((entry) => entry !== id)
      : [...draft.categories, id];
    onChange({ ...draft, categories: nextCategories });
  };

  return (
    <div className="merchant-onboarding-content">
      <h2>Store information</h2>
      <p>Tell shoppers what your store is and where it operates.</p>
      <div className="merchant-onboarding-grid">
        <label>
          Store name
          <input
            value={draft.storeName}
            onChange={(event) =>
              onChange({ ...draft, storeName: event.target.value })
            }
            placeholder="myHiro Market"
          />
        </label>
        <label>
          Store type
          <select
            value={draft.storeType}
            onChange={(event) =>
              onChange({ ...draft, storeType: event.target.value })
            }
          >
            {storeTypes.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label>
          Contact phone
          <input
            value={draft.contactPhone}
            onChange={(event) =>
              onChange({ ...draft, contactPhone: event.target.value })
            }
            placeholder="+23324..."
          />
        </label>
        <label>
          Contact email
          <input
            value={draft.contactEmail}
            onChange={(event) =>
              onChange({ ...draft, contactEmail: event.target.value })
            }
            placeholder="store@example.com"
          />
        </label>
        <label>
          City
          <input
            value={draft.city}
            onChange={(event) =>
              onChange({ ...draft, city: event.target.value })
            }
            placeholder="Accra"
          />
        </label>
        <label>
          Region
          <select
            value={draft.region}
            onChange={(event) =>
              onChange({ ...draft, region: event.target.value })
            }
          >
            <option value="">Select region</option>
            {GHANA_REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Address
        <input
          value={draft.address}
          onChange={(event) =>
            onChange({ ...draft, address: event.target.value })
          }
          placeholder="Street and landmark"
        />
      </label>
      <div className="merchant-onboarding-chip-wrap">
        {categories.map((category) => {
          const selected = draft.categories.includes(category.id);
          return (
            <button
              key={category.id}
              type="button"
              className={selected ? "active" : ""}
              onClick={() => toggleCategory(category.id)}
            >
              {category.shortName || category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
