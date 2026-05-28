/**
 * @file analysis-service.ts
 * @description Core Day 2 service: accepts a normalised evidence bundle, calls
 * Gemini using the locked prompt template, enforces a hardcoded timeout,
 * validates the JSON response, and returns a typed result envelope.
 *
 * This function NEVER throws — all failure modes are captured in the returned
 * AnalysisResult and callers decide how to surface them.
 */

import { buildAnalysisPrompt, SYSTEM_PROMPT } from "./prompt-template";
import { getGeminiModel } from "./model";
import { validateGeminiOutput } from "./validator";
import type { EvidencePacket } from "./prompt-template";
import type { GeminiAnalysisOutput } from "../../types/gemini-analysis";

// ─── Result Envelope ─────────────────────────────────────────────────────────

/** Terminal states for a single analysis run. */
export type AnalysisState = "success" | "needs_review";

/** The envelope returned by runGeminiAnalysis — never throws. */
export interface AnalysisResult {
  /** Whether the analysis succeeded and passed schema validation. */
  analysisState: AnalysisState;
  /** Parsed and validated model output (present only when state is "success"). */
  analysis?: GeminiAnalysisOutput;
  /** Validation errors when state is "needs_review" due to schema mismatch. */
  validationErrors?: string[];
  /**
  * Raw text from Gemini (present when parsing/validation failed so reviewers
   * can inspect what the model actually returned).
  */
  rawModelOutput?: string;
  /** Human-readable reason for failure (present when state is "needs_review"). */
  reason?: string;
  /** Wall-clock milliseconds taken by the model API call. */
  durationMs: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Uses a hardcoded 15 000 ms timeout.
 * Must be called inside a request handler (Next.js edge runtime guard).
 */
function getTimeoutMs(): number {
  // Hardcoded per migration requirements
  return 15_000;
}

/**
 * Attempts to extract a JSON object from a raw model reply.
 * Models sometimes wrap JSON in markdown fences even when told not to;
 * this strips them if present.
 */
function extractJson(raw: string): string {
  // Strip ```json ... ``` or ``` ... ``` fences
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return raw.trim();
}

// ─── Main Service ─────────────────────────────────────────────────────────────

/**
 * Calls the model with the evidence packet, enforces the configured timeout,
 * and returns a structured AnalysisResult.
 *
 * @param evidence - The normalised evidence bundle from the scraping pipeline.
 * @returns AnalysisResult — always resolves, never rejects.
 */
export async function runGeminiAnalysis(
  evidence: EvidencePacket
): Promise<AnalysisResult> {
  const startedAt = Date.now();

  // ── Prepare Gemini call ───────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      analysisState: "needs_review",
      reason: "GEMINI_API_KEY is not configured",
      durationMs: Date.now() - startedAt,
    };
  }

  const timeoutMs = getTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Build Gemini request body
  const userPrompt = buildAnalysisPrompt(evidence);
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: userPrompt,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  let rawText: string;
  try {
    const model = getGeminiModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const bodyText = await resp.text().catch(() => "<unreadable>");
      return {
        analysisState: "needs_review",
        reason: `Gemini API error: ${resp.status} ${resp.statusText}`,
        rawModelOutput: bodyText,
        durationMs: Date.now() - startedAt,
      };
    }

    const data = await resp.json();

    // Extract the raw text from Gemini response
    const candidate = data?.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
      return {
        analysisState: "needs_review",
        reason: "Gemini returned an unexpected response shape",
        rawModelOutput: JSON.stringify(data),
        durationMs: Date.now() - startedAt,
      };
    }

    rawText = candidate.content.parts[0].text;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isTimeout = err instanceof Error && (err.name === "AbortError" || (err as Error).message?.includes("timeout"));
    return {
      analysisState: "needs_review",
      reason: isTimeout
        ? `Gemini request timed out after ${timeoutMs}ms`
        : `Gemini API error: ${err instanceof Error ? err.message : String(err)}`,
      durationMs: Date.now() - startedAt,
    };
  }

  // ── Parse JSON ────────────────────────────────────────────────────────────
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(rawText));
  } catch {
    return {
      analysisState: "needs_review",
      reason: "Model response was not valid JSON",
      rawModelOutput: rawText,
      durationMs: Date.now() - startedAt,
    };
  }

  // ── Validate against schema ───────────────────────────────────────────────
  const validation = validateGeminiOutput(parsed);
  if (!validation.valid) {
    return {
      analysisState: "needs_review",
      validationErrors: validation.errors,
      rawModelOutput: rawText,
      reason: "Model output failed schema validation",
      durationMs: Date.now() - startedAt,
    };
  }

  // ── Success ───────────────────────────────────────────────────────────────
  return {
    analysisState: "success",
    analysis: parsed as GeminiAnalysisOutput,
    durationMs: Date.now() - startedAt,
  };
}
