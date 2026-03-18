import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Joyride, {
  ACTIONS,
  EVENTS,
  STATUS,
  type Placement,
  type CallBackProps,
  type Step
} from "react-joyride";
import type { ViewId } from "../state/types";
import { TutorialContext, type StartTourOptions } from "./TutorialContext";
import { getTourNameForView, TOUR_LABELS, TOUR_ORDER } from "./catalog";
import { TourPointer } from "./TourPointer";
import { TutorialTooltip } from "./TutorialTooltip";
import {
  merchantGlobalIntroTour,
  merchantPageCategoriesTour,
  merchantPageDashboardTour,
  merchantPageInventoryTour,
  merchantPageMessagesTour,
  merchantPageReportsTour,
  merchantPageSalesTour,
  merchantPageSettingsTour,
  merchantPageSuppliersTour,
  merchantPageSupportTour
} from "./tours/merchantTours";
import type { TourMenuItem, TourName, TutorialStepDefinition } from "./types";

const RETRY_LIMIT = 12;
const MOBILE_BREAKPOINT = 980;
const MERCHANT_TOUR_VERSION = 3;
const TOOLTIP_GAP = 12;
const TOOLTIP_WIDTH_ESTIMATE = 360;
const TOOLTIP_HEIGHT_ESTIMATE = 280;

const toursByName: Record<TourName, TutorialStepDefinition[]> = {
  merchant_global_intro: merchantGlobalIntroTour,
  merchant_page_dashboard: merchantPageDashboardTour,
  merchant_page_inventory: merchantPageInventoryTour,
  merchant_page_categories: merchantPageCategoriesTour,
  merchant_page_suppliers: merchantPageSuppliersTour,
  merchant_page_sales: merchantPageSalesTour,
  merchant_page_messages: merchantPageMessagesTour,
  merchant_page_reports: merchantPageReportsTour,
  merchant_page_support: merchantPageSupportTour,
  merchant_page_settings: merchantPageSettingsTour
};

const readMap = (key: string): Record<string, unknown> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeMap = (key: string, value: Record<string, unknown>): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
};

const seenKey = (userId: string): string => `tutorial_seen_${userId}`;
const stepKey = (userId: string): string => `tutorial_step_${userId}`;
const versionKey = (userId: string): string => `tutorial_version_${userId}`;

const clampIndex = (value: number, size: number): number => {
  if (size <= 0) return 0;
  return Math.max(0, Math.min(size - 1, value));
};

type PlacementBase = "top" | "bottom" | "left" | "right";

const placementBase = (placement: Placement): PlacementBase => {
  if (placement.startsWith("top")) return "top";
  if (placement.startsWith("bottom")) return "bottom";
  if (placement.startsWith("left")) return "left";
  return "right";
};

const oppositePlacement: Record<PlacementBase, PlacementBase> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
};

const chooseViewportPlacement = (
  preferred: Placement,
  target: HTMLElement
): Placement => {
  if (typeof window === "undefined") return preferred;

  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const tooltipWidth = Math.min(TOOLTIP_WIDTH_ESTIMATE, Math.max(220, viewportWidth - 24));
  const tooltipHeight = Math.min(TOOLTIP_HEIGHT_ESTIMATE, Math.max(180, viewportHeight - 48));

  const spaces: Record<PlacementBase, number> = {
    top: rect.top - TOOLTIP_GAP,
    bottom: viewportHeight - rect.bottom - TOOLTIP_GAP,
    left: rect.left - TOOLTIP_GAP,
    right: viewportWidth - rect.right - TOOLTIP_GAP
  };

  const preferredBase = placementBase(preferred);
  const ranked: PlacementBase[] = Array.from(
    new Set<PlacementBase>([
      preferredBase,
      oppositePlacement[preferredBase],
      "bottom",
      "top",
      "right",
      "left"
    ])
  );

  const fits = (placement: PlacementBase) => {
    if (placement === "top" || placement === "bottom") {
      return spaces[placement] >= tooltipHeight;
    }
    return spaces[placement] >= tooltipWidth;
  };

  const resolvedBase = ranked.find(fits) ?? preferredBase;
  return resolvedBase;
};

const chooseMobilePlacement = (
  preferred: Placement,
  target: HTMLElement
): Placement => {
  if (typeof window === "undefined") return preferred;

  const rect = target.getBoundingClientRect();
  const topSpace = rect.top - TOOLTIP_GAP;
  const bottomSpace = window.innerHeight - rect.bottom - TOOLTIP_GAP;
  const preferredBase = placementBase(preferred);

  if (preferredBase === "top" || preferredBase === "bottom") {
    if (preferredBase === "top" && topSpace < 180 && bottomSpace > topSpace) {
      return "bottom";
    }
    if (preferredBase === "bottom" && bottomSpace < 180 && topSpace > bottomSpace) {
      return "top";
    }
    return preferredBase;
  }

  return bottomSpace >= topSpace ? "bottom" : "top";
};

interface Props {
  userId: string;
  currentView: ViewId;
  onNavigate: (view: ViewId) => void;
  autoStartTourName?: TourName | null;
  children: ReactNode;
}

export function TutorialProvider({
  userId,
  currentView,
  onNavigate,
  autoStartTourName,
  children
}: Props) {
  const [activeTourName, setActiveTourName] = useState<TourName | null>(null);
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [joyrideKey, setJoyrideKey] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  );
  const retryCountRef = useRef<Record<number, number>>({});
  const clickAdvanceLockRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const pendingTourStartTimerRef = useRef<number | null>(null);
  const autoLaunchedRef = useRef<string>("");
  const lastVisitedViewRef = useRef<ViewId | null>(null);

  const activeSteps = useMemo(
    () => (activeTourName ? toursByName[activeTourName] ?? [] : []),
    [activeTourName]
  );
  const currentStep = activeSteps[stepIndex] ?? null;

  const resolvePlacement = useCallback(
    (step: TutorialStepDefinition): Placement => {
      const target = document.querySelector(step.target);
      const resolvedTarget = target instanceof HTMLElement ? target : null;

      if (isMobileViewport) {
        if (step.mobilePlacement) {
          return resolvedTarget
            ? chooseMobilePlacement(step.mobilePlacement, resolvedTarget)
            : step.mobilePlacement;
        }
        const preferred = step.placement ?? "bottom";
        if (preferred.startsWith("left") || preferred.startsWith("right")) {
          return resolvedTarget ? chooseMobilePlacement("bottom", resolvedTarget) : "bottom";
        }
        return resolvedTarget ? chooseMobilePlacement(preferred, resolvedTarget) : preferred;
      }

      const preferred = step.placement ?? "bottom";
      if (!resolvedTarget) {
        return preferred;
      }
      return chooseViewportPlacement(preferred, resolvedTarget);
    },
    [isMobileViewport]
  );

  const joyrideSteps: Step[] = useMemo(
    () =>
      activeSteps.map((step) => ({
        target: step.target,
        placement: resolvePlacement(step),
        content: step.content,
        disableBeacon: true,
        isFixed: false,
        spotlightClicks: true,
        data: step
      })),
    [activeSteps, resolvePlacement]
  );

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current === null) return;
    window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  }, []);

  const clearPendingTourStartTimer = useCallback(() => {
    if (pendingTourStartTimerRef.current === null) return;
    window.clearTimeout(pendingTourStartTimerRef.current);
    pendingTourStartTimerRef.current = null;
  }, []);

  const migrateTourVersionIfNeeded = useCallback(() => {
    if (typeof window === "undefined") return;

    const rawVersion = localStorage.getItem(versionKey(userId));
    const storedVersion = Number.parseInt(rawVersion ?? "0", 10);
    const resolvedVersion = Number.isFinite(storedVersion) ? storedVersion : 0;

    if (resolvedVersion >= MERCHANT_TOUR_VERSION) {
      return;
    }

    // Show the refreshed global intro exactly once after shipping a new tour version.
    const seenMap = readMap(seenKey(userId));
    delete seenMap.merchant_global_intro;
    writeMap(seenKey(userId), seenMap);

    const stepMap = readMap(stepKey(userId));
    delete stepMap.merchant_global_intro;
    writeMap(stepKey(userId), stepMap);

    localStorage.setItem(versionKey(userId), String(MERCHANT_TOUR_VERSION));
  }, [userId]);

  const persistStepIndex = useCallback(
    (tourName: TourName, value: number) => {
      const map = readMap(stepKey(userId));
      map[tourName] = value;
      writeMap(stepKey(userId), map);
    },
    [userId]
  );

  const clearStepIndex = useCallback(
    (tourName: TourName) => {
      const map = readMap(stepKey(userId));
      delete map[tourName];
      writeMap(stepKey(userId), map);
    },
    [userId]
  );

  const markTourSeen = useCallback(
    (tourName: TourName) => {
      const map = readMap(seenKey(userId));
      map[tourName] = true;
      writeMap(seenKey(userId), map);
    },
    [userId]
  );

  const stopTour = useCallback(() => {
    clearRetryTimer();
    clearPendingTourStartTimer();
    setRun(false);
    setActiveTourName(null);
    setStepIndex(0);
    setDontShowAgain(false);
    setJoyrideKey((value) => value + 1);
    retryCountRef.current = {};
    clickAdvanceLockRef.current = false;
  }, [clearPendingTourStartTimer, clearRetryTimer]);

  const completeTour = useCallback(
    (markAsSeen: boolean) => {
      if (activeTourName) {
        if (markAsSeen) {
          markTourSeen(activeTourName);
          clearStepIndex(activeTourName);
        } else {
          persistStepIndex(activeTourName, stepIndex);
        }
      }
      stopTour();
    },
    [activeTourName, clearStepIndex, markTourSeen, persistStepIndex, stepIndex, stopTour]
  );

  const startTour = useCallback(
    (tourName: TourName, options?: StartTourOptions) => {
      const steps = toursByName[tourName] ?? [];
      if (steps.length === 0) {
        return;
      }
      const firstStep = steps[0];
      if (firstStep?.route && currentView !== firstStep.route) {
        onNavigate(firstStep.route);
      }
      clearRetryTimer();
      retryCountRef.current = {};
      clickAdvanceLockRef.current = false;
      setDontShowAgain(false);
      setActiveTourName(tourName);
      setStepIndex(0);
      setJoyrideKey((value) => value + 1);
      setRun(true);
    },
    [clearRetryTimer, currentView, onNavigate]
  );

  const startTourForView = useCallback(
    (view: ViewId, options?: StartTourOptions) => {
      startTour(getTourNameForView(view), options);
    },
    [startTour]
  );

  const getTourMenuItems = useCallback((): TourMenuItem[] => {
    const seenMap = readMap(seenKey(userId));
    const stepMap = readMap(stepKey(userId));

    return TOUR_ORDER.map((tourName) => {
      const totalSteps = toursByName[tourName]?.length ?? 0;
      const hasSavedProgress = Object.prototype.hasOwnProperty.call(stepMap, tourName);
      const savedRaw = Number(stepMap[tourName] ?? 0);
      const running = run && activeTourName === tourName;
      const resolvedStepIndex = running
        ? clampIndex(stepIndex, totalSteps)
        : clampIndex(Number.isFinite(savedRaw) ? savedRaw : 0, totalSteps);

      const status: TourMenuItem["status"] = seenMap[tourName] === true
        ? "completed"
        : running || hasSavedProgress
          ? "in_progress"
          : "not_started";

      return {
        tourName,
        label: TOUR_LABELS[tourName],
        status,
        stepIndex: resolvedStepIndex,
        totalSteps
      };
    });
  }, [activeTourName, run, stepIndex, userId]);

  useEffect(() => {
    migrateTourVersionIfNeeded();
  }, [migrateTourVersionIfNeeded]);

  useEffect(() => {
    autoLaunchedRef.current = "";
    lastVisitedViewRef.current = null;
    stopTour();
  }, [userId, stopTour]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncViewport = () => {
      setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!activeTourName || !run) return;
    persistStepIndex(activeTourName, stepIndex);
  }, [activeTourName, run, stepIndex, persistStepIndex]);

  useEffect(() => {
    clickAdvanceLockRef.current = false;
  }, [activeTourName, stepIndex]);

  useEffect(() => {
    if (!run || !currentStep?.target) return;
    const handle = window.setTimeout(() => {
      const target = document.querySelector(currentStep.target);
      if (!(target instanceof HTMLElement)) return;

      const topSafeZone = 84;
      const bottomSafeZone = window.innerHeight - 36;
      const rect = target.getBoundingClientRect();
      const needsScroll = rect.top < topSafeZone || rect.bottom > bottomSafeZone;
      if (!needsScroll) return;

      target.scrollIntoView({
        behavior: "auto",
        block: "center",
        inline: "nearest"
      });
    }, 60);

    return () => window.clearTimeout(handle);
  }, [run, currentStep?.target, stepIndex, currentView]);

  useEffect(() => {
    if (!run || !currentStep?.requireClick) return;
    const selector = currentStep.target;
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(selector)) return;
      if (clickAdvanceLockRef.current) return;
      clickAdvanceLockRef.current = true;

      if (currentStep.nextRoute && currentStep.nextRoute !== currentView) {
        onNavigate(currentStep.nextRoute);
      }

      const nextIndex = stepIndex + 1;
      if (nextIndex >= activeSteps.length) {
        completeTour(true);
        return;
      }
      setStepIndex(nextIndex);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => {
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [run, currentStep, currentView, onNavigate, stepIndex, activeSteps.length, completeTour]);

  useEffect(() => {
    if (!autoStartTourName) return;
    if (isMobileViewport) return;
    const marker = `${userId}:${autoStartTourName}`;
    if (autoLaunchedRef.current === marker) return;
    autoLaunchedRef.current = marker;

    const seenMap = readMap(seenKey(userId));
    if (seenMap[autoStartTourName] === true) {
      return;
    }
    startTour(autoStartTourName);
  }, [autoStartTourName, isMobileViewport, startTour, userId]);

  useEffect(() => {
    const previousView = lastVisitedViewRef.current;
    lastVisitedViewRef.current = currentView;
    if (previousView === currentView) return;
    if (run) return;
    if (activeTourName) return;
    if (isMobileViewport) return;

    const seenMap = readMap(seenKey(userId));
    if (seenMap.merchant_global_intro !== true) return;

    const pageTour = getTourNameForView(currentView);
    if (seenMap[pageTour] === true) return;

    startTour(pageTour);
  }, [activeTourName, currentView, isMobileViewport, run, startTour, userId]);

  useEffect(
    () => () => {
      clearRetryTimer();
      clearPendingTourStartTimer();
    },
    [clearPendingTourStartTimer, clearRetryTimer]
  );

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { action, index, status, type } = data;

      if (status === STATUS.FINISHED) {
        const completedTour = activeTourName;
        completeTour(true);
        if (completedTour === "merchant_global_intro") {
          const seenMap = readMap(seenKey(userId));
          if (seenMap.merchant_page_dashboard !== true) {
            clearPendingTourStartTimer();
            pendingTourStartTimerRef.current = window.setTimeout(() => {
              pendingTourStartTimerRef.current = null;
              startTour("merchant_page_dashboard");
            }, 180);
          }
        }
        return;
      }

      if (status === STATUS.SKIPPED) {
        completeTour(dontShowAgain);
        return;
      }

      if (type === EVENTS.TARGET_NOT_FOUND) {
        const retries = (retryCountRef.current[index] ?? 0) + 1;
        retryCountRef.current[index] = retries;

        if (retries <= RETRY_LIMIT) {
          console.warn(
            `[tutorial] target not found for step ${index + 1}. Retrying (${retries}/${RETRY_LIMIT}).`
          );
          clearRetryTimer();
          retryTimerRef.current = window.setTimeout(() => {
            const selector = activeSteps[index]?.target;
            if (selector) {
              const target = document.querySelector(selector);
              if (target instanceof Element) {
                setJoyrideKey((value) => value + 1);
                setStepIndex((current) => (current === index ? current : index));
              }
            }
            retryTimerRef.current = null;
          }, 240);
          return;
        }

        console.warn(
          `[tutorial] skipping step ${index + 1} after ${RETRY_LIMIT} retries (target missing).`
        );
        const nextIndex = index + 1;
        if (nextIndex >= activeSteps.length) {
          completeTour(true);
          return;
        }
        setStepIndex(nextIndex);
        return;
      }

      if (type === EVENTS.STEP_AFTER) {
        const current = activeSteps[index];
        if (!current) return;

        if (action === ACTIONS.CLOSE) {
          completeTour(dontShowAgain);
          return;
        }

        if (action === ACTIONS.PREV) {
          setStepIndex(clampIndex(index - 1, activeSteps.length));
          return;
        }

        if (current.requireClick) {
          return;
        }

        if (current.nextRoute && current.nextRoute !== currentView) {
          onNavigate(current.nextRoute);
        }

        const nextIndex = index + 1;
        if (nextIndex >= activeSteps.length) {
          completeTour(true);
          return;
        }
        setStepIndex(nextIndex);
      }
    },
    [
      activeSteps,
      activeTourName,
      clearPendingTourStartTimer,
      clearRetryTimer,
      completeTour,
      currentView,
      dontShowAgain,
      onNavigate,
      startTour,
      userId
    ]
  );

  const contextValue = useMemo(
    () => ({
      startTour,
      startTourForView,
      getTourMenuItems,
      stopTour,
      isTourRunning: run,
      dontShowAgain,
      setDontShowAgain,
      stepIndex,
      totalSteps: activeSteps.length,
      currentStep
    }),
    [
      startTour,
      startTourForView,
      getTourMenuItems,
      stopTour,
      run,
      dontShowAgain,
      stepIndex,
      activeSteps.length,
      currentStep
    ]
  );

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
      <Joyride
        key={`${activeTourName ?? "none"}:${joyrideKey}`}
        run={run}
        stepIndex={stepIndex}
        steps={joyrideSteps}
        callback={handleJoyrideCallback}
        continuous
        hideCloseButton
        showSkipButton
        disableOverlayClose
        disableScrolling
        disableScrollParentFix={false}
        scrollToFirstStep={false}
        scrollDuration={0}
        scrollOffset={88}
        spotlightPadding={8}
        spotlightClicks
        floaterProps={{
          disableAnimation: true,
          disableFlip: true
        }}
        tooltipComponent={TutorialTooltip}
        styles={{
          options: {
            zIndex: 1200,
            overlayColor: "rgba(8, 14, 29, 0.74)",
            primaryColor: "#3257d0",
            textColor: "#141b2d",
            backgroundColor: "#ffffff",
            arrowColor: "#ffffff"
          }
        }}
      />
      <TourPointer active={run} targetSelector={currentStep?.target ?? null} />
    </TutorialContext.Provider>
  );
}
