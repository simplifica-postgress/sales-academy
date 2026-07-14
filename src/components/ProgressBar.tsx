/** Barra de progresso no estilo do dashboard Simplifica. */
export default function ProgressBar({
  value,
  className = "",
}: {
  value: number; // 0–100
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`h-2.5 w-full overflow-hidden rounded-full bg-indicator ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-dark via-primary to-cyan transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
