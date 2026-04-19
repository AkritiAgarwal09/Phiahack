import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ConciergeMemory {
  budget?: string; // e.g. "<$200"
  style?: string; // e.g. "Minimal / Neutral"
  brands: string[];
  colors: string[];
}

interface State extends ConciergeMemory {
  setField: <K extends keyof ConciergeMemory>(key: K, value: ConciergeMemory[K]) => void;
  addBrand: (b: string) => void;
  removeBrand: (b: string) => void;
  reset: () => void;
}

export const useConciergeMemory = create<State>()(
  persist(
    (set) => ({
      budget: undefined,
      style: undefined,
      brands: [],
      colors: [],
      setField: (key, value) => set({ [key]: value } as any),
      addBrand: (b) =>
        set((s) => (s.brands.includes(b) ? s : { brands: [...s.brands, b] })),
      removeBrand: (b) =>
        set((s) => ({ brands: s.brands.filter((x) => x !== b) })),
      reset: () => set({ budget: undefined, style: undefined, brands: [], colors: [] }),
    }),
    { name: "concierge-memory-v1" }
  )
);

export function memoryForPrompt(s: ConciergeMemory) {
  return {
    budget: s.budget || null,
    style: s.style || null,
    brands: s.brands || [],
    colors: s.colors || [],
  };
}
