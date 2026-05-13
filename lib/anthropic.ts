import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("Missing env var: ANTHROPIC_API_KEY");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Model used for all Claude calls per .cursorrules */
export const CLAUDE_MODEL = "claude-sonnet-4-5" as const;
