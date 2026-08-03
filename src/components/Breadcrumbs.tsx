import Link from "next/link";
import { IconArrowLeft } from "./icons";

export type Crumb = { label: string; href: string };

/**
 * The trail of where this page sits, closest ancestor last. The current page isn't
 * a crumb — its title is already the heading right below.
 */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  if (trail.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="-mb-3 flex items-center gap-0.5 text-xs text-faint">
      <IconArrowLeft className="h-3.5 w-3.5 shrink-0" />
      {trail.map((crumb, index) => (
        <span key={crumb.href} className="flex min-w-0 items-center gap-0.5">
          {index > 0 && <span aria-hidden="true">/</span>}
          <Link
            href={crumb.href}
            className="truncate rounded px-1 py-0.5 transition-colors hover:bg-surface-hover hover:text-text"
          >
            {crumb.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
