export default function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
      {label ? <p className="text-sm text-muted">{label}</p> : null}
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
