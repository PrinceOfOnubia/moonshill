import { Hero } from "@/components/home/Hero";
import { CategoryRail } from "@/components/home/CategoryRail";
import { FeedTabs } from "@/components/home/FeedTabs";
import { HowItWorks } from "@/components/home/HowItWorks";
import { CtaBand } from "@/components/home/CtaBand";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryRail />
      <FeedTabs />
      <HowItWorks />
      <CtaBand />
    </>
  );
}
