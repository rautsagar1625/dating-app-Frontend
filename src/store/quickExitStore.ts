import { create } from 'zustand';

interface QuickExitState {
  isLocked: boolean;
  pin: string | null;
  lock: () => void;
  unlock: () => void;
  setPin: (pin: string | null) => void;
}

export const useQuickExitStore = create<QuickExitState>((set) => ({
  isLocked: false,
  pin: null,
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
  setPin: (pin) => set({ pin }),
}));
