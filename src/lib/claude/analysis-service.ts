/**
 * @file analysis-service.ts
 * @description Core Day 2 service: accepts a normalised evidence bundle, calls
 * Claude using the locked prompt template, enforces ANTHROPIC_TIMEOUT_MS,
 * validates the JSON response, and returns a typed result envelope.
 *
 * This function NEVER throws — all failure modes are captured in the returned
 * AnalysisResult and callers decide how to surface them.
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildAnalysisPrompt, SYSTEM_PROMPT } from "./prompt-template";
import { validateClaudeOutput } from "./validator";
import type { EvidencePacket } from "./prompt-template";
import type { ClaudeAnalysisOutput } from "../../types/claude-analysis";

// ─── Result Envelope ─────────────────────────────────────────────────────────

/** Terminal states for a single analysis run. */
export type AnalysisState = "success" | "needs_review";

/** The envelope returned by runClaudeAnalysis — never throws. */
export interface AnalysisResult {
  /** Whether the analysis succeeded and passed schema validation. */
  analysisState: AnalysisState;
  /** Parsed and validated Claude output (present only when state is "success"). */
  analysis?: ClaudeAnalysisOutput;
  /** Validation errors when state is "needs_review" due to schema mismatch. */
  validationErrors?: string[];
  /**
   * Raw text from Claude (present when parsing/validation failed so reviewers
   * can inspect what the model actually returned).
   */
  rawModelOutput?: string;
  /** Human-readable reason for failure (present when state is "needs_review"). */
  reason?: string;
  /** Wall-clock milliseconds taken by the Claude API call. */
  durationMs: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Reads ANTHROPIC_TIMEOUT_MS from env, falls back to 15 000 ms.
 * Must be called inside a request handler (Next.js edge runtime guard).
 */
function getTimeoutMs(): number {
  const raw = process.env.ANTHROPIC_TIMEOUT_MS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15_000;
}

/**
 * Attempts to extract a JSON object from a raw model reply.
 * Claude sometimes wraps JSON in markdown fences even when told not to;
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
 * Calls Claude with the evidence packet, enforces the configured timeout,
 * and returns a structured AnalysisResult.
 *
 * @param evidence - The normalised evidence bundle from the scraping pipeline.
 * @returns AnalysisResult — always resolves, never rejects.
 */
export async function runClaudeAnalysis(
  evidence: EvidencePacket
): Promise<AnalysisResult> {
  const startedAt = Date.now();

  // ── Build the Anthropic client ────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      analysisState: "needs_review",
      reason: "ANTHROPIC_API_KEY is not configured",
      durationMs: Date.now() - startedAt,
    };
  }

  const timeoutMs = getTimeoutMs();
  const client = new Anthropic({ apiKey, timeout: timeoutMs });

  // ── Call Claude ───────────────────────────────────────────────────────────
  let rawText: string;
  try {
    const message = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildAnalysisPrompt(evidence),
        },
      ],
    });

    // Extract text content from the first content block
    const block = message.content[0];
    if (!block || block.type !== "text") {
      return {
        analysisState: "needs_review",
        reason: "Claude returned a non-text content block",
        rawModelOutput: JSON.stringify(message.content),
        durationMs: Date.now() - startedAt,
      };
    }
    rawText = block.text;
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error &&
      (err.message.includes("timeout") || err.message.includes("timed out") || err.name === "APITimeoutError");

    return {
      analysisState: "needs_review",
      reason: isTimeout
        ? `Claude request timed out after ${timeoutMs}ms`
        : `Claude API error: ${err instanceof Error ? err.message : String(err)}`,
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
      reason: "Claude response was not valid JSON",
      rawModelOutput: rawText,
      durationMs: Date.now() - startedAt,
    };
  }

  // ── Validate against schema ───────────────────────────────────────────────
  const validation = validateClaudeOutput(parsed);
  if (!validation.valid) {
    return {
      analysisState: "needs_review",
      validationErrors: validation.errors,
      rawModelOutput: rawText,
      reason: "Claude output failed schema validation",
      durationMs: Date.now() - startedAt,
    };
  }

  // ── Success ───────────────────────────────────────────────────────────────
  return {
    analysisState: "success",
    analysis: parsed as ClaudeAnalysisOutput,
    durationMs: Date.now() - startedAt,
  };
}
