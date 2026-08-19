import { ClientStatus, ClientTier } from "@prisma/client";

const TIER_STYLES: Record<ClientTier, string> = {
  ELITE: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  FOUNDERS: "bg-amber-50 text-amber-700 ring-amber-200",
};

const STATUS_STYLES: Record<ClientStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PAUSED: "bg-slate-100 text-slate-600 ring-slate-200",
  CHURNED: "bg-rose-50 text-rose-700 ring-rose-200",
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export function TierBadge({ tier }: { tier: ClientTier }) {
  return <Badge className={TIER_STYLES[tier]}>{tier === "FOUNDERS" ? "Founder's Circle" : "Elite"}</Badge>;
}

export function StatusBadge({ status }: { status: ClientStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{status}</Badge>;
}
