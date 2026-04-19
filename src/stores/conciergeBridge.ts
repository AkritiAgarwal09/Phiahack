import { create } from "zustand";

// Tells the Concierge page to seed a prompt from somewhere else (e.g. Shop quick actions).
interface State {
  pendingPrompt: string | null;
  pendingProductId: string | null;
  setPending: (prompt: string, productId?: string | null) => void;
  consume: () => { prompt: string; productId: string | null } | null;
}

export const useConciergeBridge = create<State>((set, get) => ({
  pendingPrompt: null,
  pendingProductId: null,
  setPending: (prompt, productId = null) => set({ pendingPrompt: prompt, pendingProductId: productId }),
  consume: () => {
    const s = get();
    if (!s.pendingPrompt) return null;
    set({ pendingPrompt: null, pendingProductId: null });
    return { prompt: s.pendingPrompt, productId: s.pendingProductId };
  },
}));
