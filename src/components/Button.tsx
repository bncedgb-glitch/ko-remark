import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps): ReactNode {
  const base =
    "inline-flex items-center justify-center font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)] cursor-pointer";

  const variants = {
    primary:
      "btn-primary text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale-[0.3]",
    secondary:
      "text-[var(--text-primary)] border border-[var(--border-light)] disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale-[0.3]",
    ghost:
      "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale-[0.3]",
    danger:
      "bg-transparent text-[var(--error)] hover:bg-[var(--error-light)] disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale-[0.3]",
  };

  const borderRadii: Record<string, string> = {
    primary: "14px",
    secondary: "14px",
    ghost: "12px",
    danger: "12px",
  };

  const variantShadows: Record<string, string> = {
    primary: "none",
    secondary: "0 1px 2px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
    ghost: "none",
    danger: "none",
  };

  const variantHoverShadows: Record<string, string> = {
    primary: "none",
    secondary: "0 8px 18px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.84)",
    ghost: "none",
    danger: "none",
  };

  const sizes = {
    sm: "text-[14px]",
    md: "text-[16px]",
    lg: "text-[17px]",
  };

  const sizePaddings: Record<string, React.CSSProperties> = {
    sm: { padding: "10px 18px" },
    md: { padding: "12px 24px" },
    lg: { padding: "14px 30px" },
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      style={{
        borderRadius: borderRadii[variant],
        boxShadow: variantShadows[variant],
        background: variant === "secondary"
          ? "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(245,241,236,0.88) 100%)"
          : undefined,
        transition:
          "all 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1), transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        ...sizePaddings[size],
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.boxShadow = variantHoverShadows[variant];
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = variantShadows[variant];
        e.currentTarget.style.transform = "translateY(0)";
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = "scale(0.96)";
        }
      }}
      onMouseUp={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      {...props}
    >
      {loading && (
        <span className="inline-flex gap-1 mr-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-current"
              style={{
                animation: "dotBounce 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </span>
      )}
      {icon && !loading && <span className="mr-2 inline-flex">{icon}</span>}
      {children}
    </button>
  );
}
