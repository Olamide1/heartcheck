import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notifications';

export default function App() {
  useEffect(() => {
    // Initialize services when app starts
    const initServices = async () => {
      try {
        // Initialize notification service
        try {
          await notificationService.initialize();
          console.log('App: Notification service initialized');
          
          // Check if background task is ready
          const isReady = await notificationService.isBackgroundTaskReady();
          console.log('App: Background task ready:', isReady);
        } catch (error) {
          console.log('App: Notification service initialized with limited functionality');
          // Don't fail app startup if notifications fail
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
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}
