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
    <div className="min-h-screen bg-muted/10 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </header>
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <Stepper steps={steps} currentStep={currentStep} />
          <section className="p-8">
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}
