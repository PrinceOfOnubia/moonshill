import { cn } from "@/lib/utils";
import { VerifiedBadge } from "./Badge";

export function Avatar({
  src,
  alt,
  size = 40,
  verified = false,
  ring = false,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  verified?: boolean;
  ring?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={cn(
          "h-full w-full rounded-full object-cover bg-surface-2",
          ring && "ring-2 ring-gold/40 ring-offset-2 ring-offset-bg",
        )}
      />
      {verified && (
        <VerifiedBadge
          size={Math.max(14, size * 0.36)}
          className="absolute -bottom-0.5 -right-0.5 bg-bg rounded-full"
        />
      )}
    </span>
  );
}
