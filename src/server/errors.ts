/**
 * Typed error hierarchy. No silent try/catch in this codebase.
 *
 * Server Actions catch `DomainError` and convert to typed Result responses
 * for the UI. Anything else bubbles up to Next.js error boundaries.
 */
export type DomainErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "ILLEGAL_TRANSITION"
  | "PROVIDER_NOT_CONFIGURED"
  | "CONSENT_MISSING"
  | "TOKEN_INVALID"
  | "TOKEN_EXPIRED"
  | "TOKEN_USED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "RATE_LIMITED";

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly details?: Readonly<Record<string, unknown>> | undefined;

  constructor(
    code: DomainErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super("VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends DomainError {
  constructor(entityType: string, entityId: string) {
    super("NOT_FOUND", `${entityType} not found: ${entityId}`, {
      entityType,
      entityId,
    });
    this.name = "NotFoundError";
  }
}

export class IllegalTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(
      "ILLEGAL_TRANSITION",
      `Illegal status transition: ${from} -> ${to}`,
      { from, to },
    );
    this.name = "IllegalTransitionError";
  }
}

export class ProviderNotConfiguredError extends DomainError {
  constructor(provider: string) {
    super(
      "PROVIDER_NOT_CONFIGURED",
      `Communication provider not configured: ${provider}`,
      { provider },
    );
    this.name = "ProviderNotConfiguredError";
  }
}

export class ConsentMissingError extends DomainError {
  constructor(consentType: string) {
    super("CONSENT_MISSING", `Required consent missing: ${consentType}`, {
      consentType,
    });
    this.name = "ConsentMissingError";
  }
}

export class TokenInvalidError extends DomainError {
  constructor(reason: "INVALID" | "EXPIRED" | "USED") {
    const code: DomainErrorCode =
      reason === "EXPIRED"
        ? "TOKEN_EXPIRED"
        : reason === "USED"
          ? "TOKEN_USED"
          : "TOKEN_INVALID";
    super(code, `Token ${reason.toLowerCase()}`, { reason });
    this.name = "TokenInvalidError";
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

export class RateLimitedError extends DomainError {
  constructor(message = "Too many requests") {
    super("RATE_LIMITED", message);
    this.name = "RateLimitedError";
  }
}

export class ConflictError extends DomainError {
  constructor(message = "Conflict") {
    super("CONFLICT", message);
    this.name = "ConflictError";
  }
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; code: DomainErrorCode; message: string; details?: Readonly<Record<string, unknown>> };

export function toErrorResult(err: unknown): Result<never> {
  if (err instanceof DomainError) {
    return err.details !== undefined
      ? { ok: false, code: err.code, message: err.message, details: err.details }
      : { ok: false, code: err.code, message: err.message };
  }
  // eslint-disable-next-line no-console
  console.error("[unexpected]", err);
  return {
    ok: false,
    code: "VALIDATION_ERROR",
    message: "Unexpected error",
  };
}
