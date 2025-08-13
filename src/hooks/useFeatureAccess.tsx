import { useState } from "react";
import { useSubscription } from "./useSubscription";
import { canAccessFeature } from "@/config/plans";
import UpgradeModal from "@/components/UpgradeModal";

export function useFeatureAccess() {
  const { subscription_tier } = useSubscription();
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    feature: string;
  }>({
    isOpen: false,
    feature: ""
  });

  const checkFeatureAccess = (featureName: string, requiredFeature: string) => {
    const hasAccess = canAccessFeature(subscription_tier, requiredFeature as any);
    
    if (!hasAccess) {
      setUpgradeModal({
        isOpen: true,
        feature: featureName
      });
      return false;
    }
    
    return true;
  };

  const closeUpgradeModal = () => {
    setUpgradeModal({
      isOpen: false,
      feature: ""
    });
  };

  const UpgradeModalComponent = () => (
    <UpgradeModal
      isOpen={upgradeModal.isOpen}
      onClose={closeUpgradeModal}
      feature={upgradeModal.feature}
      currentTier={subscription_tier}
    />
  );

  return {
    checkFeatureAccess,
    UpgradeModalComponent
  };
}