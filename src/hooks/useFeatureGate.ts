import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';

interface UseFeatureGateOptions {
  feature: string;
  onUpgrade?: () => void;
}

export const useFeatureGate = ({ feature, onUpgrade }: UseFeatureGateOptions) => {
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { hasActiveSubscription, isTrial, trialDaysRemaining } = useSubscription();
  const navigation = useNavigation();

  const checkAccess = (): boolean => {
    // If user has active subscription (trial or paid), allow access
    if (hasActiveSubscription) {
      return true;
    }

    // If no subscription, show upgrade prompt
    setShowUpgradePrompt(true);
    return false;
  };

  const handleUpgrade = () => {
    setShowUpgradePrompt(false);
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigation.navigate('Subscription' as never);
    }
  };

  const handleClose = () => {
    setShowUpgradePrompt(false);
  };

  const getUpgradeMessage = () => {
    if (isTrial && trialDaysRemaining <= 0) {
      return "Your trial has expired. Upgrade now to continue using this feature.";
    }
    return "This feature requires an active subscription.";
  };

  return {
    checkAccess,
    showUpgradePrompt,
    handleUpgrade,
    handleClose,
    hasAccess: hasActiveSubscription,
    upgradeMessage: getUpgradeMessage(),
  };
};
