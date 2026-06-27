import { Link } from "next-view-transitions";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  iconOnly = false,
}: {
  className?: string;
  href?: string;
  iconOnly?: boolean;
  }) {
  return (
    <Link href={href} className={cn("inline-flex items-center", className)} aria-label="Moonshill">
      {iconOnly ? (
        <img src="/logo-mark.png" alt="Moonshill" className="h-9 w-9" />
      ) : (
        <span className="inline-flex items-center gap-3">
          <img src="/logo-mark.png" alt="" aria-hidden="true" className="h-9 w-9" />
          <span className="font-display text-[26px] font-bold tracking-tight text-text sm:text-[28px]">
            Moonshill
          </span>
        </span>
      )}
    </Link>
  );
}
