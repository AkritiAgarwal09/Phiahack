import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface RecentlyViewedStore {
  ids: string[];
  add: (id: string) => void;
  clear: () => void;
}

const MAX = 12;

export const useRecentlyViewed = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      ids: [],
      add: (id) => {
        const next = [id, ...get().ids.filter((x) => x !== id)].slice(0, MAX);
        set({ ids: next });
      },
      clear: () => set({ ids: [] }),
    }),
    {
      name: "phia-recently-viewed",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
