export const MIN_DOWNSTREAM_BUDGET_MS = 15_000;
export const DEFAULT_SCAN_DEADLINE_MS = 110_000;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

export function getScanDeadlineMs(): number {
  return parsePositiveInt(process.env.SCAN_DEADLINE_MS, DEFAULT_SCAN_DEADLINE_MS);
}

export function getScanDeadlineAt(startedAt = Date.now()): string {
  return new Date(startedAt + getScanDeadlineMs()).toISOString();
}

export function getRemainingBudgetMs(deadlineAt: string | number | Date, now = Date.now()): number {
  const deadlineTime =
    deadlineAt instanceof Date
      ? deadlineAt.getTime()
      : typeof deadlineAt === "number"
        ? deadlineAt
        : Date.parse(deadlineAt);

  if (!Number.isFinite(deadlineTime)) {
    return 0;
  }

  return Math.max(0, deadlineTime - now);
}

export function hasEnoughScanBudget(deadlineAt: string | number | Date, now = Date.now()): boolean {
  return getRemainingBudgetMs(deadlineAt, now) >= MIN_DOWNSTREAM_BUDGET_MS;
}

export function createDeadlineSignal(
  deadlineAt?: string | number | Date,
  upstreamSignal?: AbortSignal,
): AbortSignal | undefined {
  if (!deadlineAt && !upstreamSignal) {
    return undefined;
  }

  const controller = new AbortController();
  const cleanup: Array<() => void> = [];

  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort((upstreamSignal as AbortSignal & { reason?: unknown }).reason ?? createAbortError("Scan aborted"));
    } else {
      const onAbort = () => {
        controller.abort((upstreamSignal as AbortSignal & { reason?: unknown }).reason ?? createAbortError("Scan aborted"));
      };

      upstreamSignal.addEventListener("abort", onAbort, { once: true });
      cleanup.push(() => upstreamSignal.removeEventListener("abort", onAbort));
    }
  }

  if (deadlineAt) {
    const remainingMs = getRemainingBudgetMs(deadlineAt);

    if (remainingMs <= 0) {
      controller.abort(createAbortError("Scan deadline exceeded"));
    } else {
      const timeout = setTimeout(() => controller.abort(createAbortError("Scan deadline exceeded")), remainingMs);
      cleanup.push(() => clearTimeout(timeout));
    }
  }

  if (controller.signal.aborted) {
    cleanup.forEach((release) => release());
  } else {
    controller.signal.addEventListener(
      "abort",
      () => {
        cleanup.forEach((release) => release());
      },
      { once: true },
    );
  }

  return controller.signal;
}

export async function raceWithAbort<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return operation;
  }

  if (signal.aborted) {
    throw ((signal as AbortSignal & { reason?: unknown }).reason as Error | undefined) ?? createAbortError("Scan aborted");
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(((signal as AbortSignal & { reason?: unknown }).reason as Error | undefined) ?? createAbortError("Scan aborted"));
    };

    signal.addEventListener("abort", onAbort, { once: true });

    operation.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

export function canRetryTransientFetch(deadlineAt: string | number | Date | undefined, attempt: number): boolean {
  return attempt < 1 && (deadlineAt ? hasEnoughScanBudget(deadlineAt) : true);
}

export class TransientFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransientFetchError";
  }
}

export function isTransientFetchError(error: unknown): boolean {
  if (error instanceof TransientFetchError) {
    return true;
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return false;
    }

    return /fetch failed|network|timeout|timed out|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(
      error.message,
    );
  }

  return false;
}