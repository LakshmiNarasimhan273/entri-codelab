import { create } from 'zustand';

export const useProctoringStore = create((set, get) => ({
  isSubmitting: false,
  violations: {
    copyCount: 0,
    pasteCount: 0,
    tabSwitchCount: 0,
    blurCount: 0,
    fullscreenExitCount: 0,
    total: 0
  },

  setIsSubmitting: (val) => {
    set({ isSubmitting: Boolean(val) });
  },

  logViolation: (type) => {
    // If currently finalizing/submitting, bypass all infraction logging
    if (get().isSubmitting) return;

    set((state) => {
      const v = { ...state.violations };
      v.total += 1;
      if (type === 'COPY_ATTEMPT') v.copyCount += 1;
      if (type === 'PASTE_ATTEMPT') v.pasteCount += 1;
      if (type === 'TAB_SWITCH') v.tabSwitchCount += 1;
      if (type === 'WINDOW_BLUR') v.blurCount += 1;
      if (type === 'FULLSCREEN_EXIT') v.fullscreenExitCount += 1;
      return { violations: v };
    });
  },

  resetViolations: () => {
    set({
      violations: {
        copyCount: 0,
        pasteCount: 0,
        tabSwitchCount: 0,
        blurCount: 0,
        fullscreenExitCount: 0,
        total: 0
      }
    });
  }
}));

