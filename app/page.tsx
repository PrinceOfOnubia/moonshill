import { FeaturedBanners } from "@/components/home/FeaturedBanners";
import { CategoryRail } from "@/components/home/CategoryRail";
import { FeedTabs } from "@/components/home/FeedTabs";
import { HowItWorks } from "@/components/home/HowItWorks";
import { CtaBand } from "@/components/home/CtaBand";

export default function HomePage() {
  return (
    <>
      <FeaturedBanners />
      <CategoryRail />
      <FeedTabs />
      <HowItWorks />
      <CtaBand />
    </>
  );
}
