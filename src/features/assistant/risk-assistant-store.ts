import { create } from "zustand";

export type RiskAssistantMessage = {
  id: string;
  question: string;
  response: string;
  status: "streaming" | "complete";
};

type RiskAssistantState = {
  opened: boolean;
  messagesByContext: Record<string, RiskAssistantMessage[]>;
  open: () => void;
  close: () => void;
  beginMessage: (contextKey: string, question: string) => string;
  appendResponse: (contextKey: string, messageId: string, chunk: string) => void;
  replaceResponse: (contextKey: string, messageId: string, response: string) => void;
  completeMessage: (contextKey: string, messageId: string) => void;
  clearMessages: (contextKey: string) => void;
};

export const useRiskAssistantStore = create<RiskAssistantState>((set) => ({
  opened: false,
  messagesByContext: {},
  open: () => set({ opened: true }),
  close: () => set({ opened: false }),
  beginMessage: (contextKey, question) => {
    const id = crypto.randomUUID();
    set((state) => ({
      messagesByContext: {
        ...state.messagesByContext,
        [contextKey]: [
          ...(state.messagesByContext[contextKey] ?? []),
          { id, question, response: "", status: "streaming" },
        ],
      },
    }));
    return id;
  },
  appendResponse: (contextKey, messageId, chunk) =>
    set((state) => ({
      messagesByContext: {
        ...state.messagesByContext,
        [contextKey]: (state.messagesByContext[contextKey] ?? []).map((message) =>
          message.id === messageId ? { ...message, response: message.response + chunk } : message,
        ),
      },
    })),
  replaceResponse: (contextKey, messageId, response) =>
    set((state) => ({
      messagesByContext: {
        ...state.messagesByContext,
        [contextKey]: (state.messagesByContext[contextKey] ?? []).map((message) =>
          message.id === messageId ? { ...message, response } : message,
        ),
      },
    })),
  completeMessage: (contextKey, messageId) =>
    set((state) => ({
      messagesByContext: {
        ...state.messagesByContext,
        [contextKey]: (state.messagesByContext[contextKey] ?? []).map((message) =>
          message.id === messageId ? { ...message, status: "complete" } : message,
        ),
      },
    })),
  clearMessages: (contextKey) =>
    set((state) => ({
      messagesByContext: { ...state.messagesByContext, [contextKey]: [] },
    })),
}));
