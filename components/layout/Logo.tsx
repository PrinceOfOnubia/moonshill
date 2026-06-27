import { Link } from "next-view-transitions";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center", className)} aria-label="Moonshill">
      <img src="/logo-full.png" alt="Moonshill" className="h-8 w-auto sm:h-8" />
    </Link>
  );
}
