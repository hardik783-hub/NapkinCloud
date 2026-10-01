import type { NodeStatus } from '@/types/canvas';

/**
 * Compile/deploy outcome classification.
 *
 * The ONLY authority on deployment failure is the backend's own response
 * (`success: false` with an error/validation payload). Anything else —
 * a dropped connection, a proxy timeout, a non-JSON body, an unexpected
 * payload — leaves the outcome UNKNOWN, and the UI must never render a
 * false `FAILED` badge for it (nor fake `LIVE`/CREATE_COMPLETE without a
 * real success response).
 */
export type CompileOutcome =
  | {
      /** Backend authoritatively reported success — use its actual status/outputs. */
      kind: 'success';
      /** Deployment status from the response (e.g. "CREATE_COMPLETE", "DRY_RUN"). */
      status?: string;
      message?: string;
    }
  | {
      /** Backend authoritatively reported failure (validation/compile/deploy error). */
      kind: 'rejected';
      message: string;
    }
  | {
      /** No authoritative answer (network/proxy/parse failure). Neutral state. */
      kind: 'unconfirmed';
      message: string;
    };

export const UNCONFIRMED_MESSAGE =
  'Deployment status could not be confirmed (no response from the compile service). ' +
  'Check the AWS console before retrying — no failure has been reported.';

export interface CompileOutcomeInput {
  /** Parsed JSON response body, when one could be read. */
  body?: unknown;
  /** Error thrown by fetch(), when the request itself failed. */
  fetchError?: unknown;
}

function extractErrorMessage(body: Record<string, unknown>): string {
  const validation = body.validation as { errors?: unknown } | undefined;
  const errors = Array.isArray(validation?.errors) ? validation.errors : [];
  const joined = errors.filter(Boolean).join('\n');
  if (joined) return joined;
  if (typeof body.error === 'string' && body.error) return body.error;
  return 'Compilation failed.';
}

/** Map a response/fetch result to an authoritative compile outcome. */
export function classifyCompileOutcome(input: CompileOutcomeInput): CompileOutcome {
  if (input.fetchError !== undefined && input.fetchError !== null) {
    return { kind: 'unconfirmed', message: UNCONFIRMED_MESSAGE };
  }

  const body = input.body;
  if (!body || typeof body !== 'object') {
    // Missing or non-JSON body (e.g. proxy 504 HTML) — no verdict available.
    return { kind: 'unconfirmed', message: UNCONFIRMED_MESSAGE };
  }

  const record = body as Record<string, unknown>;

  if (record.success === true) {
    return {
      kind: 'success',
      status: typeof record.status === 'string' ? record.status : undefined,
      message: typeof record.message === 'string' ? record.message : undefined,
    };
  }

  if (record.success === false) {
    // The /api/compile proxy marks its synthetic connection-error body as
    // `unverified` — the backend never answered, so the deployment outcome
    // is unknown rather than failed.
    if (record.unverified === true) {
      return { kind: 'unconfirmed', message: UNCONFIRMED_MESSAGE };
    }
    return { kind: 'rejected', message: extractErrorMessage(record) };
  }

  // Unexpected payload shape without an authoritative verdict.
  return { kind: 'unconfirmed', message: UNCONFIRMED_MESSAGE };
}

/**
 * Node badge status for an outcome — `FAILED` only ever comes from an
 * authoritative backend rejection; unknown outcomes fall back to the
 * neutral default state instead of falsely claiming deployment failure.
 */
export function nodeStatusForOutcome(outcome: CompileOutcome): NodeStatus {
  switch (outcome.kind) {
    case 'success':
      return 'live';
    case 'rejected':
      return 'failed';
    case 'unconfirmed':
      return 'draft';
  }
}
