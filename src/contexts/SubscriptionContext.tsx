import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '../services/supabase';
import { subscriptionService } from '../services/subscriptions';

interface SubscriptionContextType {
  hasActiveSubscription: boolean;
  isTrial: boolean;
  trialDaysRemaining: number;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscription = async () => {
    try {
      const { user } = await auth.getCurrentUser();
      if (!user) {
        setHasActiveSubscription(false);
        setIsTrial(false);
        setTrialDaysRemaining(0);
        return;
      }

      const summary = await subscriptionService.getSubscriptionSummary(user.id);
      setHasActiveSubscription(summary.hasSubscription);
      setIsTrial(summary.isTrial);
      setTrialDaysRemaining(summary.trialDaysRemaining);
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      setHasActiveSubscription(false);
      setIsTrial(false);
      setTrialDaysRemaining(0);
    }
  };

  useEffect(() => {
    const initializeSubscription = async () => {
      setIsLoading(true);
      await refreshSubscription();
      setIsLoading(false);
    };

    initializeSubscription();

    // Listen for auth state changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        await refreshSubscription();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: SubscriptionContextType = {
    hasActiveSubscription,
    isTrial,
    trialDaysRemaining,
    isLoading,
    refreshSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
