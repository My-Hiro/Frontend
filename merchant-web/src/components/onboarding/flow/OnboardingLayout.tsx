import type { ReactNode } from "react";
import { Stepper, type OnboardingStepMeta } from "./Stepper";

interface Props {
  title: string;
  subtitle: string;
  steps: OnboardingStepMeta[];
  currentStep: number;
  children: ReactNode;
}

export function OnboardingLayout({
  title,
  subtitle,
  steps,
  currentStep,
  children
}: Props) {
  return (
    <div className="merchant-onboarding-shell">
      <div className="merchant-onboarding-frame">
        <header className="merchant-onboarding-header">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </header>
        <Stepper steps={steps} currentStep={currentStep} />
        <section className="merchant-onboarding-card">{children}</section>
      </div>
    </div>
  );
}

