import {create} from "zustand";
import {persist, createJSONStorage} from "zustand/middleware";

export const useScoreStore = create(
  persist(
    (set, get) => ({
      bestScore: 0,
      updateBest: (score) => {
        const currentBest = get().bestScore;
        if (typeof score === "number" && score > currentBest) {
          set({bestScore: score});
        }
      },
      resetBest: () => set({bestScore: 0}), // Not used
    }),
    {
      name: "score-store",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({bestScore: state.bestScore}),
    },
  ),
);
