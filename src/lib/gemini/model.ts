const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}