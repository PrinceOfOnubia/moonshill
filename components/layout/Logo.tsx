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
    <Link href={href} className={cn("inline-flex items-center", className)} aria-label="Memebook">
      {iconOnly ? (
        <img src="/logo-mark.png" alt="Memebook" className="h-9 w-9" />
      ) : (
        <img src="/logo-full.png" alt="Memebook" className="h-7 w-auto sm:h-8" />
      )}
    </Link>
  );
}
