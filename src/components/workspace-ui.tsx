import type { LucideIcon } from "lucide-react";
import Link from "@/components/navigation-link";

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red";
}) {
  return (
    <span className={`status-badge status-${tone}`}>
      <span />
      {children}
    </span>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  note,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  note: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="stat-icon">
        <Icon size={20} />
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </>
  );
  return href ? (
    <Link href={href} className="stat-card stat-card-link">
      {content}
    </Link>
  ) : (
    <div className="stat-card">{content}</div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="workspace-empty">
      <span>
        <Icon size={25} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
