import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "link";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex items-center justify-center font-medium transition-all duration-[var(--duration-fast)] ease-[var(--ease)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[3px]";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98] px-24 py-12 rounded-md text-body font-semibold",
  ghost:
    "bg-transparent text-fg border border-rule hover:bg-fg hover:text-bg px-16 py-8 rounded-md text-sub",
  link: "text-fg hover:text-accent underline-offset-4 hover:underline text-meta lg:text-meta-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
