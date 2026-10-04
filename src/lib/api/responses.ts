import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "EMAIL_NOT_VERIFIED"
  | "FORBIDDEN"
  | "RESOURCE_NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export function createRequestId() {
  return `req_${randomUUID()}`;
}

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true as const, data }, init);
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  options?: {
    fieldErrors?: Record<string, string[]>;
    requestId?: string;
  },
) {
  const requestId = options?.requestId ?? createRequestId();

  return NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
        ...(options?.fieldErrors ? { fieldErrors: options.fieldErrors } : {}),
        requestId,
      },
    },
    { status, headers: { "x-request-id": requestId } },
  );
}
