import type { ReactNode } from "react";

export default function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-card-border bg-card p-5 sm:p-6 ${className}`}
    >
      {title ? <p className="label-dash mb-4">{title}</p> : null}
      {children}
    </section>
  );
}
