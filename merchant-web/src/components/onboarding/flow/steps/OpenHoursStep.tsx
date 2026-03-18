import type { MerchantOnboardingDraft } from "../types";

interface Props {
  draft: MerchantOnboardingDraft;
  onChange: (next: MerchantOnboardingDraft) => void;
}

export function OpenHoursStep({ draft, onChange }: Props) {
  const applyMondayToAll = () => {
    const monday = draft.openHoursByDay.find((entry) => entry.day === "Mon");
    if (!monday) return;
    onChange({
      ...draft,
      openHoursByDay: draft.openHoursByDay.map((entry) =>
        entry.day === "Mon"
          ? entry
          : {
              ...entry,
              open: monday.open,
              close: monday.close,
              closed: monday.closed
            }
      )
    });
  };

  return (
    <div className="merchant-onboarding-content">
      <h2>Opening hours</h2>
      <p>Configure daily hours to keep discovery status accurate.</p>
      <div className="merchant-onboarding-actions-inline">
        <button type="button" onClick={applyMondayToAll}>
          Apply Mon to All
        </button>
      </div>
      <div className="merchant-hours-grid">
        {draft.openHoursByDay.map((entry, index) => (
          <div className="merchant-hours-row" key={entry.day}>
            <strong>{entry.day}</strong>
            <label className="merchant-hours-check">
              <input
                type="checkbox"
                checked={Boolean(entry.closed)}
                onChange={(event) => {
                  const next = [...draft.openHoursByDay];
                  next[index] = { ...entry, closed: event.target.checked };
                  onChange({ ...draft, openHoursByDay: next });
                }}
              />
              Closed
            </label>
            <div className="merchant-hours-time-wrap">
              <input
                type="time"
                value={entry.open}
                disabled={Boolean(entry.closed)}
                onChange={(event) => {
                  const next = [...draft.openHoursByDay];
                  next[index] = { ...entry, open: event.target.value };
                  onChange({ ...draft, openHoursByDay: next });
                }}
              />
              <span>to</span>
              <input
                type="time"
                value={entry.close}
                disabled={Boolean(entry.closed)}
                onChange={(event) => {
                  const next = [...draft.openHoursByDay];
                  next[index] = { ...entry, close: event.target.value };
                  onChange({ ...draft, openHoursByDay: next });
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
