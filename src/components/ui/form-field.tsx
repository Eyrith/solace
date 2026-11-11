"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  className?: string;
  children: (fieldProps: {
    id: string;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
    required?: boolean;
  }) => React.ReactNode;
}

/**
 * Accessible form field wrapper linking visible label, persistent helper guidance,
 * and inline error message via aria-describedby.
 */
export function FormField({
  id,
  label,
  required,
  helperText,
  error,
  className,
  children,
}: FormFieldProps) {
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children({
        id,
        required,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {helperText && (
        <p id={helperId} className="text-xs text-[var(--muted-foreground)] leading-normal">
          {helperText}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-[var(--destructive)] leading-normal"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export interface ErrorSummaryItem {
  fieldId: string;
  message: string;
}

export interface ErrorSummaryProps {
  title?: string;
  errors: ErrorSummaryItem[];
  summaryRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Focusable form-level validation summary linking directly to invalid inputs.
 */
export function ErrorSummary({
  title = "Review the highlighted fields before continuing",
  errors,
  summaryRef,
}: ErrorSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <div
      ref={summaryRef}
      role="alert"
      tabIndex={-1}
      aria-labelledby="form-error-summary-title"
      className="rounded-[var(--ds-radius)] border border-[var(--destructive)] bg-[color-mix(in_srgb,var(--destructive)_7%,transparent)] p-4 text-sm text-[var(--foreground)] focus:outline-2 focus:outline-[var(--destructive)]"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle
          className="h-4 w-4 text-[var(--destructive)] shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="space-y-2">
          <h2 id="form-error-summary-title" className="font-semibold text-sm">
            {title}
          </h2>
          <ul className="space-y-1 text-xs">
            {errors.map((item) => (
              <li key={item.fieldId}>
                <a
                  href={`#${item.fieldId}`}
                  className="underline underline-offset-2 font-medium text-[var(--destructive)] hover:opacity-80"
                >
                  {item.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

