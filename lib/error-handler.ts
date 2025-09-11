/**
 * Standardized error handling utilities for the Cloudinary SaaS application
 */

export interface ApiErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error types
export const ErrorTypes = {
  // Authentication & Authorization
  UNAUTHORIZED: new AppError("Authentication required", 401, "UNAUTHORIZED"),
  FORBIDDEN: new AppError("Access denied", 403, "FORBIDDEN"),

  // Validation
  VALIDATION_ERROR: new AppError("Invalid input data", 400, "VALIDATION_ERROR"),
  MISSING_FILE: new AppError("No file provided", 400, "MISSING_FILE"),
  INVALID_FILE_TYPE: new AppError(
    "Invalid file type",
    400,
    "INVALID_FILE_TYPE"
  ),
  FILE_TOO_LARGE: new AppError(
    "File size exceeds limit",
    413,
    "FILE_TOO_LARGE"
  ),
  MISSING_REQUIRED_FIELDS: new AppError(
    "Required fields are missing",
    400,
    "MISSING_REQUIRED_FIELDS"
  ),

  // Cloudinary
  CLOUDINARY_UPLOAD_FAILED: new AppError(
    "Failed to upload to Cloudinary",
    502,
    "CLOUDINARY_UPLOAD_FAILED"
  ),
  CLOUDINARY_CONFIG_ERROR: new AppError(
    "Cloudinary configuration error",
    500,
    "CLOUDINARY_CONFIG_ERROR"
  ),

  // Database
  DATABASE_ERROR: new AppError(
    "Database operation failed",
    500,
    "DATABASE_ERROR"
  ),
  RECORD_NOT_FOUND: new AppError("Record not found", 404, "RECORD_NOT_FOUND"),

  // General
  INTERNAL_ERROR: new AppError("Internal server error", 500, "INTERNAL_ERROR"),
  NETWORK_ERROR: new AppError("Network request failed", 503, "NETWORK_ERROR"),
} as const;

export function createErrorResponse(
  error: AppError | Error,
  details?: unknown
): ApiErrorResponse {
  const timestamp = new Date().toISOString();

  if (error instanceof AppError) {
    return {
      error: error.message,
      message: error.message,
      code: error.code,
      details,
      timestamp,
    };
  }

  // Handle generic errors
  return {
    error: "An unexpected error occurred",
    message: error.message || "An unexpected error occurred",
    code: "INTERNAL_ERROR",
    details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    timestamp,
  };
}

export function createSuccessResponse<T>(
  data: T,
  message?: string
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

export function handleApiError(error: unknown): ApiErrorResponse {
  console.error("API Error:", error);

  if (error instanceof AppError) {
    return createErrorResponse(error);
  }

  if (error instanceof Error) {
    return createErrorResponse(error);
  }

  return createErrorResponse(
    new AppError("An unknown error occurred", 500, "UNKNOWN_ERROR")
  );
}

// Validation helpers
export function validateFileUpload(
  file: File | null,
  maxSize: number = 60 * 1024 * 1024
): void {
  if (!file) {
    throw ErrorTypes.MISSING_FILE;
  }

  if (file.size > maxSize) {
    throw new AppError(
      `File size (${(file.size / (1024 * 1024)).toFixed(
        2
      )}MB) exceeds maximum allowed size (${maxSize / (1024 * 1024)}MB)`,
      413,
      "FILE_TOO_LARGE"
    );
  }
}

export function validateRequiredFields(fields: Record<string, unknown>): void {
  const missingFields = Object.entries(fields)
    .filter(
      ([, value]) =>
        !value || (typeof value === "string" && value.trim() === "")
    )
    .map(([key]) => key);

  if (missingFields.length > 0) {
    throw new AppError(
      `Missing required fields: ${missingFields.join(", ")}`,
      400,
      "MISSING_REQUIRED_FIELDS"
    );
  }
}

export function validateCloudinaryConfig(): void {
  if (
    !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_SECRET_KEY
  ) {
    throw ErrorTypes.CLOUDINARY_CONFIG_ERROR;
  }
}
