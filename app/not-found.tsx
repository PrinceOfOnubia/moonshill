import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-7xl font-bold text-gold-grad">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold">This challenge ended</h1>
      <p className="mt-2 max-w-sm text-muted">The page you&apos;re looking for isn&apos;t in the arena. Head back and find a live one.</p>
      <Link href="/" className="mt-6">
        <Button size="lg" magnetic>Back to home</Button>
      </Link>
    </div>
  );
}
