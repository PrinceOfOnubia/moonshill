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
        <img src="/moonshill-wordmark.png" alt="Moonshill" className="h-9 w-9 object-cover object-left" />
      ) : (
        <img src="/moonshill-wordmark.png" alt="Moonshill" className="h-9 w-auto sm:h-11" />
      )}
    </Link>
  );
}
