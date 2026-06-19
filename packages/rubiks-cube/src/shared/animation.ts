export const AnimationStyles = {
  Exponential: 'exponential',
  Linear: 'linear',
  Next: 'next',
  Fixed: 'fixed',
  Match: 'match',
} as const;

export type AnimationStyle = (typeof AnimationStyles)[keyof typeof AnimationStyles];
