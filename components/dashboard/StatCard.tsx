import { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  /** @deprecated Ignored — all cards use primary brand. */
  accent?: "primary" | "sales" | "purchases";
};

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: StatCardProps) {
  return (
    <article className="rek-stat-card group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          <h2 className="mt-2 break-words text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {value}
          </h2>
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="rek-stat-icon">
          <Icon size={26} aria-hidden />
        </div>
      </div>
    </article>
  );
}
