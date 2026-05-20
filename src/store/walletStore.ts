import { create } from 'zustand';

interface WalletState {
  credits: number;
  addCredits: (amount: number) => void;
  deductCredits: (amount: number) => boolean;
  syncBalance: (balance: number) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  credits: 0,
  addCredits:    (amount)  => set((s) => ({ credits: s.credits + amount })),
  syncBalance:   (balance) => set({ credits: balance }),
  deductCredits: (amount)  => {
    const current = get().credits;
    if (current >= amount) {
      set({ credits: current - amount });
      return true;
    }
    return false;
  },
}));
