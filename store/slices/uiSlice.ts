import { StateCreator } from 'zustand';

export interface UISlice {
  isLoading: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  isLoading: false,
  error: null,
  setError: (msg) => set({ error: msg }),
});
