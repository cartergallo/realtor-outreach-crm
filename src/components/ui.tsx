import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-white/70 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  children: ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-clay text-white hover:bg-clayd",
    ghost: "border border-line bg-white text-ink hover:bg-paper",
    danger: "bg-red-600 text-white hover:bg-red-700",
  } as const;
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const tones = {
    neutral: "bg-paper text-muted border-line",
    good: "bg-moss/10 text-moss border-moss/20",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    bad: "bg-red-50 text-red-700 border-red-200",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-clay ${
        props.className ?? ""
      }`}
    />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-clay ${
        props.className ?? ""
      }`}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
      {children}
    </label>
  );
}
