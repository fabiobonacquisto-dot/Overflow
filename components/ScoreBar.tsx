function barColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export function ScoreBar({
  label,
  score,
  detail,
}: {
  label: string;
  score: number;
  detail?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {score}
          {detail ? <span className="text-slate-400"> · {detail}</span> : null}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${barColor(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function ProducerScoreDial({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color =
    clamped >= 80 ? "text-emerald-600" : clamped >= 50 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`text-4xl font-bold ${color}`}>{Math.round(clamped)}</div>
      <div className="text-xs uppercase tracking-wide text-slate-400 mt-1">Producer Score</div>
    </div>
  );
}
