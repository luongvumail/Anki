import { StateCreator } from 'zustand';

export interface AuthSlice {
  userId: string | null;
  setUserId: (id: string | null) => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  userId: null,
  setUserId: (id) => set({ userId: id }),
});
