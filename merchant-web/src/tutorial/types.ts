import type { Placement } from "react-joyride";
import type { ViewId } from "../state/types";

export type TourName =
  | "merchant_global_intro"
  | "merchant_page_dashboard"
  | "merchant_page_inventory"
  | "merchant_page_categories"
  | "merchant_page_suppliers"
  | "merchant_page_sales"
  | "merchant_page_messages"
  | "merchant_page_reports"
  | "merchant_page_support"
  | "merchant_page_settings";

export type TourMenuItemStatus = "not_started" | "in_progress" | "completed";

export interface TourMenuItem {
  tourName: TourName;
  label: string;
  status: TourMenuItemStatus;
  stepIndex: number;
  totalSteps: number;
}

export interface TutorialStepDefinition {
  id: string;
  target: string;
  title: string;
  content: string;
  placement?: Placement;
  mobilePlacement?: Placement;
  route?: ViewId;
  nextRoute?: ViewId;
  requireClick?: boolean;
}
