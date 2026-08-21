import { FlashOffersCard } from "./FlashOffersCard";
import { FeatureList } from "./FeatureList";

export function HomeSidebar() {
  return (
    <div className="hidden lg:flex flex-col gap-6">
      <FlashOffersCard />
      <FeatureList />
   </div>
  );
}
