export type OnboardingStep = 'awaiting_timezone' | 'confirming_timezone';

export type OnboardingState = {
  step: OnboardingStep;
  pendingTimezone?: string;
};
