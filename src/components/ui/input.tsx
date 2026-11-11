"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Text input primitive with 16px mobile text floor (prevents iOS auto-zoom),
 * 44px minimum touch height, and explicit invalid state contrast.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex min-h-11 w-full rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)]",
          "px-3.5 py-2 text-base sm:text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]",
          "transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
          "aria-[invalid=true]:border-[var(--destructive)] aria-[invalid=true]:focus-visible:outline-[var(--destructive)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "read-only:bg-[var(--muted)] read-only:cursor-default",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

/**
 * Password input with accessible show/hide toggle supporting password managers.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative flex items-center">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-12", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

