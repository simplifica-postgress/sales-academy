import { TRAINING_WEEKS } from "@/lib/constants";

/** Cartões das 4 semanas do treinamento, com status conforme o dia atual. */
export default function Journey({ currentDay }: { currentDay: number }) {
  const day = currentDay || 1;

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
      {TRAINING_WEEKS.map((w) => {
        const [start, end] = w.days;
        const done = day > end;
        const current = day >= start && day <= end;
        const pct = current ? Math.round(((day - start + 1) / (end - start + 1)) * 100) : done ? 100 : 0;

        return (
          <div
            key={w.week}
            className="rounded-xl p-3.5"
            style={{
              background: current ? "rgba(0,135,248,.07)" : "#020d23",
              border: `1px solid ${current ? "rgba(0,135,248,.4)" : "rgba(0,45,115,.4)"}`,
              opacity: !done && !current ? 0.65 : 1,
            }}
          >
            <div className="flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: current ? "#00cbff" : "#9db2c3" }}>
              <span>Semana {w.week}</span>
              {done ? <span className="text-cyan">✓</span> : current ? <span style={{ animation: "pulseSoft 2s infinite" }}>em curso</span> : null}
            </div>
            <div className="mt-[7px] text-[12.5px] font-medium" style={{ color: done || current ? "#ffffff" : "#9db2c3" }}>
              {w.name}
            </div>
            <div className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-indicator">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: current ? "linear-gradient(90deg,#0087f8,#00cbff)" : "#0087f8",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
