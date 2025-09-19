import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, AppState, AppStateStatus } from 'react-native';
import { auth } from '../services/supabase';
import { supabase } from '../services/supabase';
import { Colors, Typography, Spacing } from '../constants';
import { RootStackParamList, MainTabParamList } from '../types';

// Import screens
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import AccountSetupScreen from '../screens/onboarding/AccountSetupScreen';
import EmailConfirmationScreen from '../screens/onboarding/EmailConfirmationScreen';
import LoginScreen from '../screens/onboarding/LoginScreen';
import PairPartnerScreen from '../screens/onboarding/PairPartnerScreen';
import JoinPartnerScreen from '../screens/onboarding/JoinPartnerScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import DailyCheckInScreen from '../screens/main/DailyCheckInScreen';
import ReportsScreen from '../screens/main/ReportsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SubscriptionScreen from '../screens/main/SubscriptionScreen';
import InvitePartnerScreen from '../screens/main/InvitePartnerScreen';
import ExerciseDetailScreen from '../screens/main/ExerciseDetailScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Loading screen
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
    <Text style={{ fontSize: Typography.fontSize.h1, color: Colors.textPrimary }}>HeartCheck</Text>
    <Text style={{ fontSize: Typography.fontSize.body, color: Colors.textSecondary, marginTop: Spacing.sm }}>
      Loading...
    </Text>
  </View>
);

// Main tab navigator
const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarStyle: {
        backgroundColor: Colors.surface,
        borderTopColor: 'rgba(0,0,0,0.1)',
        borderTopWidth: 1,
        paddingBottom: Spacing.sm,
        paddingTop: Spacing.sm,
        height: 80,
        elevation: 8,
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      tabBarActiveTintColor: Colors.primarySage,
      tabBarInactiveTintColor: Colors.textSecondary,
      headerShown: false,
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
      },
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{
        tabBarLabel: 'Dashboard',
        tabBarIcon: ({ color, size }) => (
          <View style={{ 
            width: size, 
            height: size, 
            justifyContent: 'center', 
            alignItems: 'center'
          }}>
            <Text style={{ 
              color, 
              fontSize: size * 0.7, 
              fontWeight: 'bold'
            }}>●</Text>
          </View>
        ),
      }}
    />
    <Tab.Screen
      name="CheckIn"
      component={DailyCheckInScreen}
      options={{
        tabBarLabel: 'Check-In',
        tabBarIcon: ({ color, size }) => (
          <View style={{ 
            width: size, 
            height: size, 
            justifyContent: 'center', 
            alignItems: 'center'
          }}>
            <Text style={{ 
              color, 
              fontSize: size * 0.7, 
              fontWeight: 'bold'
            }}>●</Text>
          </View>
        ),
      }}
    />
    <Tab.Screen
      name="Reports"
      component={ReportsScreen}
      options={{
        tabBarLabel: 'Reports',
        tabBarIcon: ({ color, size }) => (
          <View style={{ 
            width: size, 
            height: size, 
            justifyContent: 'center', 
            alignItems: 'center'
          }}>
            <Text style={{ 
              color, 
              fontSize: size * 0.7, 
              fontWeight: 'bold'
            }}>●</Text>
          </View>
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ color, size }) => (
          <View style={{ 
            width: size, 
            height: size, 
            justifyContent: 'center', 
            alignItems: 'center'
          }}>
            <Text style={{ 
              color, 
              fontSize: size * 0.7, 
              fontWeight: 'bold'
            }}>●</Text>
          </View>
        ),
      }}
    />
  </Tab.Navigator>
);

// Main app navigator
const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Check authentication state
    const checkAuth = async () => {
      try {
        // Fast, storage-only read first (avoids network while resuming)
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user || null;

        // If we have no session locally, treat as signed out immediately
        if (!sessionUser) {
          console.log('No local session found');
          setIsAuthenticated(false);
          setHasCompletedOnboarding(false);
          return;
        }

        // Optionally confirm/refresh user; this can hang on iOS resume, so it is guarded by timeout at caller
        const { user } = await auth.getCurrentUser();
        if (user) {
          console.log('User authenticated:', user.email);
          setIsAuthenticated(true);
          
          // Check if user has completed onboarding by looking for profile in database
          try {
            const { data: profile, error } = await supabase
              .from('users')
              .select('id')
              .eq('id', user.id)
              .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
              console.log('Error checking profile:', error);
            }
            
            const hasProfile = !!profile;
            console.log('User has profile in database:', hasProfile);
            
            if (hasProfile) {
              console.log('Setting hasCompletedOnboarding to TRUE - user has profile');
              setHasCompletedOnboarding(true);
            } else {
              console.log('Setting hasCompletedOnboarding to FALSE - user has no profile');
              setHasCompletedOnboarding(false);
            }
          } catch (dbError) {
            console.log('Database check failed, assuming no profile:', dbError);
            setHasCompletedOnboarding(false);
          }
        } else {
          console.log('No authenticated user found');
          setIsAuthenticated(false);
          setHasCompletedOnboarding(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setHasCompletedOnboarding(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Timeout guard: never let loading hang forever
    const runWithTimeout = async (fn: () => Promise<void>, timeoutMs = 8000) => {
      try {
        await Promise.race([
          fn(),
          new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    runWithTimeout(checkAuth);

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in:', session.user.email);
        setIsAuthenticated(true);
        
        // Check if this user already has a profile in the database
        try {
          const { data: profile, error } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single();
          
          if (error && error.code !== 'PGRST116') {
            console.log('Error checking profile on sign in:', error);
          }
          
          const hasProfile = !!profile;
          console.log('User has profile on sign in:', hasProfile);
          
          if (hasProfile) {
            console.log('Setting hasCompletedOnboarding to TRUE on sign in - user has profile');
            setHasCompletedOnboarding(true);
          } else {
            console.log('Setting hasCompletedOnboarding to FALSE on sign in - user has no profile');
            setHasCompletedOnboarding(false);
          }
        } catch (dbError) {
          console.log('Database check failed on sign in:', dbError);
          setHasCompletedOnboarding(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setIsAuthenticated(false);
        setHasCompletedOnboarding(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('Token refreshed for user:', session.user.email);
        setIsAuthenticated(true);
        
        // Check if they have a profile in database
        try {
          const { data: profile, error } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single();
          
          if (error && error.code !== 'PGRST116') {
            console.log('Error checking profile on token refresh:', error);
          }
          
          const hasProfile = !!profile;
          console.log('User has profile on token refresh:', hasProfile);
          setHasCompletedOnboarding(hasProfile);
        } catch (dbError) {
          console.log('Database check failed on token refresh:', dbError);
          setHasCompletedOnboarding(false);
        }
      }
    });

    // Foreground re-check
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App returned to foreground - re-checking auth');
        setIsLoading(true);
        runWithTimeout(checkAuth, 8000);
      }
      appState.current = nextAppState;
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  console.log('Navigation state - isAuthenticated:', isAuthenticated, 'hasCompletedOnboarding:', hasCompletedOnboarding);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: Colors.background },
        }}
      >
        {!isAuthenticated ? (
          // Auth flow
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
            <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen} />
            <Stack.Screen name="PairPartner" component={PairPartnerScreen} />
            <Stack.Screen name="JoinPartner" component={JoinPartnerScreen} />
          </>
        ) : !hasCompletedOnboarding ? (
          // Onboarding flow
          <>
            <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
            <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen} />
            <Stack.Screen name="PairPartner" component={PairPartnerScreen} />
            <Stack.Screen name="JoinPartner" component={JoinPartnerScreen} />
          </>
        ) : (
          // Main app
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} />
            <Stack.Screen name="InvitePartner" component={InvitePartnerScreen} />
            <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
