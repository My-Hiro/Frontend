import type { ViewId } from "../state/types";
import { getTourNameForView } from "./catalog";
import { useTutorial } from "./TutorialContext";
import type { TourMenuItem } from "./types";

interface Props {
  currentView: ViewId;
  onClose: () => void;
}

const statusLabel = (item: TourMenuItem): string => {
  if (item.status === "completed") {
    return "Completed";
  }
  if (item.status === "in_progress") {
    const step = Math.max(1, Math.min(item.stepIndex + 1, Math.max(1, item.totalSteps)));
    return `In progress (${step}/${item.totalSteps})`;
  }
  return "Not started";
};

const statusClassName = (status: TourMenuItem["status"]): string => {
  if (status === "completed") return "is-completed";
  if (status === "in_progress") return "is-progress";
  return "is-pending";
};

export function TutorialMenu({ currentView, onClose }: Props) {
  const { getTourMenuItems, startTour, startTourForView } = useTutorial();
  const menuItems = getTourMenuItems();
  const currentPageTour = getTourNameForView(currentView);
  const currentPageItem = menuItems.find((item) => item.tourName === currentPageTour) ?? null;

  const startFromMenu = (tourName: TourMenuItem["tourName"]) => {
    startTour(tourName, { forceRestart: true });
    onClose();
  };

  return (
    <section className="tutorial-menu" role="menu" aria-label="Tutorial menu">
      <header className="tutorial-menu-head">
        <strong>Tutorials</strong>
        <small>Choose a walkthrough</small>
      </header>

      {currentPageItem && (
        <button
          type="button"
          className="tutorial-menu-quick"
          role="menuitem"
          onClick={() => {
            startTourForView(currentView, { forceRestart: true });
            onClose();
          }}
        >
          <div>
            <strong>{`Current page: ${currentPageItem.label}`}</strong>
            <small>Replay this page walkthrough</small>
          </div>
          <span className={`tutorial-status ${statusClassName(currentPageItem.status)}`}>
            {statusLabel(currentPageItem)}
          </span>
        </button>
      )}

      <div className="tutorial-menu-list">
        {menuItems.map((item) => (
          <button
            type="button"
            key={item.tourName}
            className="tutorial-menu-item"
            role="menuitem"
            onClick={() => startFromMenu(item.tourName)}
          >
            <span className="tutorial-menu-item-title">{item.label}</span>
            <span className={`tutorial-status ${statusClassName(item.status)}`}>
              {statusLabel(item)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
