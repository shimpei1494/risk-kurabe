import { createParser } from "@openuidev/react-lang";
import { describe, expect, it } from "vite-plus/test";

import { riskAssistantLibrary } from "../../features/assistant/risk-assistant-library";
import { ASSISTANT_PREVIEW_FIXTURES } from "./fixtures";

const parser = createParser(riskAssistantLibrary.toJSONSchema(), "AssistantCard");

describe("AI component preview fixtures", () => {
  it.each(ASSISTANT_PREVIEW_FIXTURES)("$labelをOpenUIとして解釈できる", ({ response }) => {
    const result = parser.parse(response);
    expect(result.meta.errors).toEqual([]);
    expect(result.meta.unresolved).toEqual([]);
    expect(result.root).toBeDefined();
  });
});
