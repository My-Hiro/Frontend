import type { TooltipRenderProps } from "react-joyride";
import { useTutorial } from "./TutorialContext";
import type { TutorialStepDefinition } from "./types";

export function TutorialTooltip({
  backProps,
  closeProps,
  index,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps
}: TooltipRenderProps) {
  const { dontShowAgain, setDontShowAgain } = useTutorial();
  const definition = (step.data ?? {}) as Partial<TutorialStepDefinition>;
  const requireClick = Boolean(definition.requireClick);
  const isLast = index >= size - 1;

  return (
    <section {...tooltipProps} className="tour-tooltip">
      <header className="tour-tooltip-head">
        <strong className="tour-tooltip-title">{definition.title || "Quick tour"}</strong>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close tutorial"
          onClick={closeProps.onClick}
        >
          X
        </button>
      </header>

      <p className="tour-tooltip-body">
        {definition.content || "Follow these quick steps to learn how to use this section."}
      </p>

      {requireClick && (
        <p className="tour-tooltip-hint">
          Click the highlighted item to continue.
        </p>
      )}

      <div className="tour-tooltip-progress" aria-label={`Step ${index + 1} of ${size}`}>
        <span>{index + 1}/{size}</span>
        <div className="tour-tooltip-dots">
          {Array.from({ length: size }).map((_, dotIndex) => (
            <span
              key={dotIndex}
              className={dotIndex === index ? "tour-dot active" : "tour-dot"}
            />
          ))}
        </div>
      </div>

      <label className="check-inline tour-tooltip-check">
        <input
          type="checkbox"
          checked={dontShowAgain}
          onChange={(event) => setDontShowAgain(event.target.checked)}
        />
        <span>Don't show again</span>
      </label>

      <footer className="tour-tooltip-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={skipProps.onClick}
        >
          Skip
        </button>
        <div className="inline-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={backProps.onClick}
            disabled={index === 0}
          >
            Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={primaryProps.onClick}
            disabled={requireClick}
          >
            {requireClick ? "Waiting for click..." : isLast ? "Finish" : "Next"}
          </button>
        </div>
      </footer>
    </section>
  );
}
