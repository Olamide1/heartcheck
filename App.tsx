import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Linking } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { simpleNotificationService } from './src/services/notifications-simple';
import { initializeStripe } from './src/services/payments';
import { subscriptionService } from './src/services/subscriptions';
import { supabase } from './src/services/supabase';

export default function App() {
  useEffect(() => {
    // Initialize services when app starts
    const initServices = async () => {
      try {
        // Initialize notification service
        try {
          await simpleNotificationService.initialize();
          console.log('App: Notification service initialized');
        } catch (error) {
          console.log('App: Notification service initialized with limited functionality');
          // Don't fail app startup if notifications fail
        }

        // Initialize Stripe
        try {
          await initializeStripe();
          console.log('App: Stripe initialized');
        } catch (error) {
          console.log('App: Stripe initialization failed (payments will be disabled):', error);
        }
        
        // Ensure all existing users have subscriptions
        const { subscriptionService } = await import('./src/services/subscriptions');
        try {
          await subscriptionService.ensureAllUsersHaveSubscriptions();
          console.log('App: Subscription service initialized and users ensured');
        } catch (error) {
          console.log('App: Subscription service initialized (user subscriptions will be created on-demand)');
          // Don't fail app startup if this fails - subscriptions will be created when users access the subscription screen
        }
        
      } catch (error) {
        console.error('App: Failed to initialize services:', error);
      }
    };

    initServices();
    
    // Handle deep links for payment success
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      
      if (url.includes('payment-success')) {
        console.log('Payment success deep link detected');
        
        // Extract parameters from the URL
        const urlParts = url.split('?');
        const queryString = urlParts[1] || '';
        console.log('Query string:', queryString);
        
        const urlParams = new URLSearchParams(queryString);
        const plan = urlParams.get('plan') as 'monthly' | 'annual';
        const userId = urlParams.get('user_id');
        
        console.log('Extracted plan:', plan, 'user_id:', userId);
        
        if (plan && userId) {
          console.log('Processing payment success for user:', userId, 'plan:', plan);
          
          // Update user's subscription status
          subscriptionService.upgradeToPlan(userId, plan)
            .then(() => {
              console.log('✅ Subscription updated successfully');
            })
            .catch((error) => {
              console.error('❌ Failed to update subscription:', error);
            });
        } else {
          console.log('Missing plan or user_id in deep link - trying fallback');
          
          // Fallback: If no parameters, try to get current user and upgrade to monthly
          // This handles cases where the deep link doesn't include parameters
          supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
            if (user) {
              console.log('Fallback: Upgrading current user to monthly plan');
              subscriptionService.upgradeToPlan(user.id, 'monthly')
                .then(() => {
                  console.log('✅ Fallback subscription update successful');
                })
                .catch((error) => {
                  console.error('❌ Fallback subscription update failed:', error);
                });
            }
          });
        }
      } else {
        console.log('Deep link does not contain payment-success');
      }
    };
    
    // Listen for deep links
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });
    
    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });
    
    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}
