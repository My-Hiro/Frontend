import { createContext, useContext } from "react";
import type { ViewId } from "../state/types";
import type { TourName, TutorialStepDefinition } from "./types";
import type { TourMenuItem } from "./types";

export interface StartTourOptions {
  forceRestart?: boolean;
}

export interface TutorialContextValue {
  startTour: (tourName: TourName, options?: StartTourOptions) => void;
  startTourForView: (view: ViewId, options?: StartTourOptions) => void;
  getTourMenuItems: () => TourMenuItem[];
  stopTour: () => void;
  isTourRunning: boolean;
  dontShowAgain: boolean;
  setDontShowAgain: (value: boolean) => void;
  stepIndex: number;
  totalSteps: number;
  currentStep: TutorialStepDefinition | null;
}

export const TutorialContext = createContext<TutorialContextValue | null>(null);

export const useTutorial = (): TutorialContextValue => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used inside TutorialProvider");
  }
  return context;
};
