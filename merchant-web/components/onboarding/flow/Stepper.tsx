import { Check } from "lucide-react";

export interface OnboardingStepMeta {
  id: string;
  label: string;
}

interface Props {
  steps: OnboardingStepMeta[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: Props) {
  return (
    <div className="merchant-stepper" aria-label="Onboarding progress">
      {steps.map((step, index) => {
        const completed = index < currentStep;
        const active = index === currentStep;
        return (
          <div className="merchant-stepper-item" key={step.id}>
            <div
              className={`merchant-stepper-dot${
                completed ? " is-complete" : active ? " is-active" : ""
              }`}
              aria-current={active ? "step" : undefined}
            >
              {completed ? <Check size={14} /> : index + 1}
            </div>
            <span
              className={`merchant-stepper-label${
                completed || active ? " is-strong" : ""
              }`}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span
                className={`merchant-stepper-line${
                  completed ? " is-complete" : ""
                }`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

