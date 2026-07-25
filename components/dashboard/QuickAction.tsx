import Link from "next/link";
import { LucideIcon } from "lucide-react";

type QuickActionProps = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export default function QuickAction({
  title,
  href,
  icon: Icon,
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className="rek-grid-tile group flex items-center gap-3.5 p-4"
    >
      <div className="rek-icon-box size-11 transition group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon size={20} aria-hidden />
      </div>
      <span className="text-[15px] font-bold text-foreground">{title}</span>
    </Link>
  );
}
