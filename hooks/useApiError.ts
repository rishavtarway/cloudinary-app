"use client";

import { useState, useCallback } from "react";
import { AxiosError } from "axios";

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
  statusCode?: number;
}

export function useApiError() {
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: unknown) => {
    console.error("API Error:", error);

    if (error instanceof AxiosError) {
      const response = error.response;
      if (response?.data) {
        setError({
          message:
            response.data.message || response.data.error || "An error occurred",
          code: response.data.code,
          details: response.data.details,
          statusCode: response.status,
        });
      } else {
        setError({
          message: error.message || "Network error occurred",
          statusCode: error.response?.status,
        });
      }
    } else if (error instanceof Error) {
      setError({
        message: error.message,
      });
    } else {
      setError({
        message: "An unknown error occurred",
      });
    }
  }, []);

  const executeWithErrorHandling = useCallback(
    async <T>(asyncFunction: () => Promise<T>): Promise<T | null> => {
      setIsLoading(true);
      clearError();

      try {
        const result = await asyncFunction();
        return result;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, clearError]
  );

  return {
    error,
    isLoading,
    clearError,
    handleError,
    executeWithErrorHandling,
  };
}

// Specific error messages for common scenarios
export const ErrorMessages = {
  NETWORK_ERROR:
    "Unable to connect to the server. Please check your internet connection.",
  UNAUTHORIZED: "You need to sign in to access this feature.",
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION_ERROR: "Please check your input and try again.",
  FILE_TOO_LARGE: "The file is too large. Please choose a smaller file.",
  INVALID_FILE_TYPE:
    "Invalid file type. Please choose a supported file format.",
  UPLOAD_FAILED: "Upload failed. Please try again.",
  FETCH_FAILED: "Failed to load data. Please refresh the page.",
  GENERIC_ERROR: "Something went wrong. Please try again.",
} as const;

export function getErrorMessage(error: ApiError | null): string {
  if (!error) return "";

  // Check for specific error codes
  switch (error.code) {
    case "UNAUTHORIZED":
      return ErrorMessages.UNAUTHORIZED;
    case "FORBIDDEN":
      return ErrorMessages.FORBIDDEN;
    case "RECORD_NOT_FOUND":
      return ErrorMessages.NOT_FOUND;
    case "VALIDATION_ERROR":
      return ErrorMessages.VALIDATION_ERROR;
    case "FILE_TOO_LARGE":
      return ErrorMessages.FILE_TOO_LARGE;
    case "INVALID_FILE_TYPE":
      return ErrorMessages.INVALID_FILE_TYPE;
    case "CLOUDINARY_UPLOAD_FAILED":
      return ErrorMessages.UPLOAD_FAILED;
    case "DATABASE_ERROR":
      return ErrorMessages.FETCH_FAILED;
    default:
      // Check status codes
      switch (error.statusCode) {
        case 401:
          return ErrorMessages.UNAUTHORIZED;
        case 403:
          return ErrorMessages.FORBIDDEN;
        case 404:
          return ErrorMessages.NOT_FOUND;
        case 413:
          return ErrorMessages.FILE_TOO_LARGE;
        case 422:
          return ErrorMessages.VALIDATION_ERROR;
        case 500:
        case 502:
        case 503:
          return ErrorMessages.GENERIC_ERROR;
        default:
          return error.message || ErrorMessages.GENERIC_ERROR;
      }
  }
}
