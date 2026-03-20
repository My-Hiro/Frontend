'use client';

import type { Category } from "@/types";
import type { MerchantOnboardingDraft } from "../types";
import { GHANA_REGIONS } from "@/lib/constants/ghanaRegions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Store information</h2>
        <p className="text-sm text-muted-foreground">Tell shoppers what your store is and where it operates.</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Store name</Label>
          <Input
            value={draft.storeName}
            onChange={(event) =>
              onChange({ ...draft, storeName: event.target.value })
            }
            placeholder="myHiro Market"
          />
        </div>
        <div className="space-y-2">
          <Label>Store type</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
        </div>
        <div className="space-y-2">
          <Label>Contact phone</Label>
          <Input
            value={draft.contactPhone}
            onChange={(event) =>
              onChange({ ...draft, contactPhone: event.target.value })
            }
            placeholder="+23324..."
          />
        </div>
        <div className="space-y-2">
          <Label>Contact email</Label>
          <Input
            value={draft.contactEmail}
            onChange={(event) =>
              onChange({ ...draft, contactEmail: event.target.value })
            }
            placeholder="store@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input
            value={draft.city}
            onChange={(event) =>
              onChange({ ...draft, city: event.target.value })
            }
            placeholder="Accra"
          />
        </div>
        <div className="space-y-2">
          <Label>Region</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Address</Label>
        <Input
          value={draft.address}
          onChange={(event) =>
            onChange({ ...draft, address: event.target.value })
          }
          placeholder="Street and landmark"
        />
      </div>

      <div className="space-y-3">
        <Label>Store categories</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const selected = draft.categories.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                className={cn(
                  "px-4 py-2 rounded-full border text-sm font-medium transition-all",
                  selected 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-background hover:bg-muted text-muted-foreground"
                )}
                onClick={() => toggleCategory(category.id)}
              >
                {category.shortName || category.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
