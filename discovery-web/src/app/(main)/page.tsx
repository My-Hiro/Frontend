import { discoveryService } from "@/services/discovery.service";
import { HomeClient } from "@/features/HomeClient";

export default async function HomePage() {
  // Fetch data on the server
  const [categories, home, storeProfileBanners] = await Promise.all([
    discoveryService.getPlatformCategories(),
    discoveryService.getHome(),
    discoveryService.getSponsoredBanners("store_profile")
  ]);

  return (
    <HomeClient 
      initialCategories={categories}
      initialHome={home}
      initialStoreProfileBanners={storeProfileBanners}
    />
  );
}
