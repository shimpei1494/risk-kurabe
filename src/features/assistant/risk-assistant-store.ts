import { create } from "zustand";

export type RiskAssistantMessage = {
  id: string;
  question: string;
  response: string;
};

type RiskAssistantState = {
  opened: boolean;
  messagesByContext: Record<string, RiskAssistantMessage[]>;
  open: () => void;
  close: () => void;
  addMessage: (contextKey: string, question: string, response: string) => void;
  clearMessages: (contextKey: string) => void;
};

export const useRiskAssistantStore = create<RiskAssistantState>((set) => ({
  opened: false,
  messagesByContext: {},
  open: () => set({ opened: true }),
  close: () => set({ opened: false }),
  addMessage: (contextKey, question, response) =>
    set((state) => ({
      messagesByContext: {
        ...state.messagesByContext,
        [contextKey]: [
          ...(state.messagesByContext[contextKey] ?? []),
          { id: crypto.randomUUID(), question, response },
        ],
      },
    })),
  clearMessages: (contextKey) =>
    set((state) => ({
      messagesByContext: { ...state.messagesByContext, [contextKey]: [] },
    })),
}));
