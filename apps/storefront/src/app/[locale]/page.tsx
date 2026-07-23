import { HeroSection } from "@/components/home/hero-section";
import { OccasionGrid } from "@/components/home/occasion-grid";
import { FeaturedCarousel } from "@/components/home/featured-carousel";
import { EditorialSection } from "@/components/home/editorial-section";
import { TrustBar } from "@/components/layout/trust-bar";
import { AnnouncementBar } from "@/components/layout/announcement-bar";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  return (
    <>
      <AnnouncementBar />
      <HeroSection />
      <OccasionGrid />
      <FeaturedCarousel />
      <EditorialSection />
      <TrustBar locale={locale} />
    </>
  );
}
