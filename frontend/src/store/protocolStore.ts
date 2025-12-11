import { create } from 'zustand';
import type { ProtocolState } from '../types/protocol';

interface ProtocolStore {
  currentProtocol: ProtocolState | null;
  isGenerating: boolean;
  error: string | null;
  
  // ⭐ CHANGE THIS LINE - Accept both direct value and updater function
  setCurrentProtocol: (
    protocol: ProtocolState | null | ((prev: ProtocolState | null) => ProtocolState | null)
  ) => void;
  
  setIsGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useProtocolStore = create<ProtocolStore>((set) => ({
  currentProtocol: null,
  isGenerating: false,
  error: null,
  
  // ⭐ CHANGE THIS IMPLEMENTATION - Handle both cases
  setCurrentProtocol: (protocol) => {
    if (typeof protocol === 'function') {
      // It's an updater function like (prev) => {...}
      set((state) => ({ currentProtocol: protocol(state.currentProtocol) }));
    } else {
      // It's a direct value
      set({ currentProtocol: protocol });
    }
  },
  
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setError: (error) => set({ error }),
  reset: () => set({ currentProtocol: null, isGenerating: false, error: null }),
}));
