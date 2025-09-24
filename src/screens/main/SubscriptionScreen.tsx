import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, Layout } from '../../constants';
import { subscriptionService } from '../../services/subscriptions';
import { paymentService, initializeStripe } from '../../services/payments';
import { Platform } from 'react-native';
import { iapService, IAP_PRODUCT_IDS } from '../../services/iap';
import { supabase } from '../../services/supabase';
import { Linking } from 'react-native';

const { width } = Dimensions.get('window');

const SubscriptionScreen = ({ navigation }: any) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [subscriptionSummary, setSubscriptionSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stripeInitialized, setStripeInitialized] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  const pricing = paymentService.getPricing();

  useEffect(() => {
    initializeApp();
  }, []); // Only run once on mount

  // Separate effect for payment success check that only runs when currentUser is available
  useEffect(() => {
    if (!currentUser) return;
    
    // Check for payment success in URL parameters as fallback
    const checkPaymentSuccess = () => {
      const url = window.location?.href || '';
      if (url.includes('payment_success=true')) {
        const urlParams = new URLSearchParams(url.split('?')[1] || '');
        const plan = urlParams.get('plan') as 'monthly' | 'annual';
        const userId = urlParams.get('user_id');
        
        if (plan && userId && currentUser?.id === userId) {
          console.log('Payment success detected via URL fallback, updating subscription...');
          subscriptionService.upgradeToPlan(userId, plan)
            .then(() => {
              console.log('✅ Subscription updated via fallback');
              // Reload subscription data
              loadSubscriptionData();
            })
            .catch((error) => {
              console.error('❌ Failed to update subscription via fallback:', error);
            });
        }
      }
    };
    
    // Check after a short delay to ensure currentUser is loaded
    setTimeout(checkPaymentSuccess, 1000);
  }, [currentUser?.id]); // Only re-run when currentUser.id changes

  const initializeApp = async () => {
    try {
      // iOS: initialize StoreKit; Android/Web: initialize Stripe
      if (Platform.OS === 'ios') {
        await iapService.initialize();
      } else {
        const stripeReady = await initializeStripe();
        setStripeInitialized(stripeReady);
      }
      
      // Load subscription data
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  const loadSubscriptionData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        setIsLoading(false);
        return;
      }
      
      setCurrentUser(user);
      
      // Get subscription summary
      const summary = await subscriptionService.getSubscriptionSummary(user.id);
      setSubscriptionSummary(summary);
      
      console.log('Subscription data loaded successfully:', summary);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      Alert.alert(
        'Error', 
        'Unable to load subscription data. Please try again.',
        [
          { text: 'OK' }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    if (!currentUser) {
      Alert.alert('Error', 'Please sign in to subscribe');
      return;
    }

    // iOS → StoreKit; Android → Stripe
    if (Platform.OS === 'ios') {
      try {
        const productId = plan === 'monthly' ? IAP_PRODUCT_IDS.monthly : IAP_PRODUCT_IDS.yearly;
        await iapService.requestSubscription(productId);
        // Immediately reflect locally; server receipt validation optional later
        await subscriptionService.upgradeToPlan(currentUser.id, plan);
        await loadSubscriptionData();
        Alert.alert('Success', 'Your subscription is now active.');
      } catch (error) {
        console.error('IAP subscribe error:', error);
        Alert.alert('Error', 'Purchase was not completed.');
      }
      return;
    }

    if (!stripeInitialized) {
      Alert.alert('Error', 'Payment system not ready. Please try again.');
      return;
    }

    try {
      setIsCreatingCheckout(true);
      setSelectedPlan(plan);
      
      // Create Stripe Checkout session
      const { url } = await paymentService.createCheckoutSession(
        pricing[plan].price,
        plan,
        currentUser.id
      );
      
      // Open Stripe Checkout in browser
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open payment page. Please try again.');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      Alert.alert('Error', 'Failed to create payment session. Please try again.');
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const handleRefreshSubscription = async () => {
    try {
      setIsLoading(true);
      await loadSubscriptionData();
      Alert.alert('Success', 'Subscription status refreshed!');
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      Alert.alert('Error', 'Failed to refresh subscription status');
    }
  };


  const handleManageSubscription = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please sign in to manage subscription');
      return;
    }

    try {
      setIsLoading(true);
      const { url } = await subscriptionService.createCustomerPortalSession(currentUser.id);
      
      // Open Stripe customer portal in browser
      const { Linking } = require('react-native');
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening customer portal:', error);
      Alert.alert('Error', 'Failed to open billing management. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreSubscription = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please sign in to restore subscription');
      return;
    }

    try {
      setIsLoading(true);
      if (Platform.OS === 'ios') {
        const purchases = await iapService.restorePurchases();
        const hasMonthly = purchases.some((p: any) => p.productId === IAP_PRODUCT_IDS.monthly);
        const hasYearly = purchases.some((p: any) => p.productId === IAP_PRODUCT_IDS.yearly);
        if (hasMonthly || hasYearly) {
          const plan = hasYearly ? 'annual' : 'monthly';
          await subscriptionService.upgradeToPlan(currentUser.id, plan);
          await loadSubscriptionData();
          Alert.alert('Success', 'Purchases restored.');
        } else {
          await loadSubscriptionData();
          Alert.alert('No Purchases', 'No active subscriptions were found to restore.');
        }
      } else {
        await loadSubscriptionData();
        Alert.alert('Success', 'Subscription data refreshed.');
      }
    } catch (error) {
      console.error('Error restoring subscription:', error);
      Alert.alert('Error', 'Failed to restore subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleStartTrial = () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please sign in to start trial');
      return;
    }

    Alert.alert(
      'Free Trial Started!',
      'Your 7-day free trial is now active. Enjoy all premium features!',
      [
        {
          text: 'Awesome!',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const getTrialStatusText = () => {
    if (!subscriptionSummary?.isTrial) return null;
    
    const daysLeft = subscriptionSummary.trialDaysRemaining;
    if (daysLeft === 0) return 'Trial expires today';
    if (daysLeft === 1) return 'Trial expires tomorrow';
    return `${daysLeft} days left in trial`;
  };

  const getPlanPrice = (plan: 'monthly' | 'annual') => {
    return plan === 'monthly' ? 6.99 : 59.99;
  };

  const getPlanPeriod = (plan: 'monthly' | 'annual') => {
    return plan === 'monthly' ? 'month' : 'year';
  };

  const getSavings = (plan: 'monthly' | 'annual') => {
    if (plan === 'annual') {
      const monthlyCost = 6.99 * 12;
      const annualCost = 59.99;
      const savings = monthlyCost - annualCost;
      return `Save $${savings.toFixed(0)}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primarySage} />
          <Text style={styles.loadingText}>Loading subscription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Choose Your Plan</Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Grow your relationship, together</Text>
          <Text style={styles.heroSubtitle}>
            Unlock insights and tools to strengthen your connection
          </Text>
        </View>

        {/* Trial Expired Banner */}
        {subscriptionSummary && subscriptionSummary.isTrial && subscriptionSummary.trialDaysRemaining <= 0 && (
          <View style={styles.trialExpiredBanner}>
            <View style={styles.trialExpiredContent}>
              <Text style={styles.trialExpiredIcon}>⏰</Text>
              <View style={styles.trialExpiredText}>
                <Text style={styles.trialExpiredTitle}>Trial Expired</Text>
                <Text style={styles.trialExpiredSubtitle}>Upgrade now to continue using premium features</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.trialExpiredButton}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.8}
            >
              <Text style={styles.trialExpiredButtonText}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Current Status */}
        {subscriptionSummary && (
          <View style={styles.statusSection}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Your Current Status</Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={handleRefreshSubscription}
                activeOpacity={0.7}
              >
                <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statusCard}>
              {subscriptionSummary.isTrial ? (
                <>
                  <Text style={styles.statusText}>
                    {subscriptionSummary.trialDaysRemaining > 0 ? '🎉 Free Trial Active' : '⏰ Trial Expired'}
                  </Text>
                  <Text style={styles.statusSubtext}>
                    {subscriptionSummary.trialDaysRemaining > 0 
                      ? getTrialStatusText() 
                      : 'Upgrade to continue using premium features'
                    }
                  </Text>
                </>
              ) : subscriptionSummary.hasSubscription ? (
                <>
                  <Text style={styles.statusText}>✅ {subscriptionSummary.plan} Plan Active</Text>
                  <Text style={styles.statusSubtext}>
                    Next billing: {new Date(subscriptionSummary.nextBillingDate).toLocaleDateString()}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.statusText}>📱 No Active Plan</Text>
                  <Text style={styles.statusSubtext}>Start your free trial today!</Text>
                </>
              )}
            </View>

            {/* Subscription Management Actions */}
            {Platform.OS !== 'ios' && subscriptionSummary.hasSubscription && !subscriptionSummary.isTrial && (
              <View style={styles.managementSection}>
                <Text style={styles.managementTitle}>Manage Subscription</Text>
                <View style={styles.managementButtons}>
                  <TouchableOpacity 
                    style={styles.managementButton}
                    onPress={handleManageSubscription}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.managementButtonText}>⚙️ Manage Billing</Text>
                  </TouchableOpacity>
                  
                </View>
              </View>
            )}

            {/* Restore Subscription Option */}
            <View style={styles.restoreSection}>
              <TouchableOpacity 
                style={styles.restoreButton}
                onPress={handleRestoreSubscription}
                activeOpacity={0.8}
              >
                <Text style={styles.restoreButtonText}>🔄 Restore Subscription</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What's included:</Text>
          {[
            'Daily private check-ins',
            'Pattern detection & alerts',
            'Monthly relationship reports',
            'Guided exercises & tips',
            'Partner connection insights',
            'Data export & backup',
          ].map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Pricing Toggle */}
        <View style={styles.pricingToggle}>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              selectedPlan === 'monthly' && styles.toggleOptionActive,
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text
              style={[
                styles.toggleOptionText,
                selectedPlan === 'monthly' && styles.toggleOptionTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.toggleOption,
              selectedPlan === 'annual' && styles.toggleOptionActive,
            ]}
            onPress={() => setSelectedPlan('annual')}
          >
            <Text
              style={[
                styles.toggleOptionText,
                selectedPlan === 'annual' && styles.toggleOptionTextActive,
              ]}
            >
              Annual
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plan Cards */}
        <View style={styles.plansContainer}>
          {/* Free Trial Plan - Show differently based on current status */}
          <View style={[
            styles.planCard,
            subscriptionSummary.isTrial && styles.currentPlanCard
          ]}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Free Trial</Text>
              <View style={styles.trialRibbon}>
                <Text style={styles.trialRibbonText}>7 Days</Text>
              </View>
              {subscriptionSummary.isTrial && (
                <View style={styles.currentPlanBadge}>
                  <Text style={styles.currentPlanBadgeText}>Current Plan</Text>
                </View>
              )}
            </View>
            
            <View style={styles.planPricing}>
              <Text style={styles.planPrice}>$0</Text>
              <Text style={styles.planPeriod}>for 7 days</Text>
            </View>
            
            <Text style={styles.planDescription}>
              {subscriptionSummary.isTrial 
                ? `You're currently on a free trial with ${subscriptionSummary.trialDaysRemaining} days remaining`
                : 'Try all premium features free for 7 days'
              }
            </Text>
            
            {!subscriptionSummary.isTrial && !subscriptionSummary.hasSubscription ? (
              <>
                <TouchableOpacity
                  style={styles.planButton}
                  onPress={handleStartTrial}
                  activeOpacity={0.8}
                >
                  <Text style={styles.planButtonText}>Start Free Trial</Text>
                </TouchableOpacity>
                
                <Text style={styles.planNote}>
                  Then ${getPlanPrice(selectedPlan)}/{getPlanPeriod(selectedPlan)}
                </Text>
              </>
            ) : subscriptionSummary.isTrial ? (
              <View style={styles.currentPlanInfo}>
                <Text style={styles.currentPlanStatus}>🎉 Trial Active</Text>
                <Text style={styles.currentPlanDays}>{subscriptionSummary.trialDaysRemaining} days left</Text>
              </View>
            ) : (
              <View style={styles.currentPlanInfo}>
                <Text style={styles.currentPlanStatus}>✅ Active Subscription</Text>
                <Text style={styles.currentPlanDays}>You already have an active plan</Text>
              </View>
            )}
          </View>

          {/* Selected Plan */}
          <View style={[
            styles.planCard, 
            styles.selectedPlanCard,
            !subscriptionSummary.isTrial && !subscriptionSummary.hasSubscription && styles.recommendedPlanCard
          ]}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>
                {selectedPlan === 'monthly' ? 'Monthly' : 'Annual'} Plan
              </Text>
              {getSavings(selectedPlan) && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>{getSavings(selectedPlan)}</Text>
                </View>
              )}
              {!subscriptionSummary.isTrial && !subscriptionSummary.hasSubscription && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>Recommended</Text>
                </View>
              )}
              {subscriptionSummary.hasSubscription && subscriptionSummary.plan === selectedPlan && (
                <View style={styles.currentPlanBadge}>
                  <Text style={styles.currentPlanBadgeText}>Current Plan</Text>
                </View>
              )}
            </View>
            
            <View style={styles.planPricing}>
              <Text style={styles.planPrice}>${getPlanPrice(selectedPlan)}</Text>
              <Text style={styles.planPeriod}>per {getPlanPeriod(selectedPlan)}</Text>
            </View>
            
            <Text style={styles.planDescription}>
              {selectedPlan === 'annual' 
                ? 'Best value - save 29% compared to monthly'
                : 'Flexible monthly billing'
              }
            </Text>
            
            {subscriptionSummary.hasSubscription && subscriptionSummary.plan === selectedPlan ? (
              <View style={styles.currentPlanInfo}>
                <Text style={styles.currentPlanStatus}>✅ Current Plan</Text>
                <Text style={styles.currentPlanDays}>You're subscribed to this plan</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.planButton, 
                  subscriptionSummary.isTrial ? styles.upgradeButton : styles.selectedPlanButton,
                  isCreatingCheckout && styles.planButtonDisabled
                ]}
                onPress={() => handleSubscribe(selectedPlan)}
                activeOpacity={0.8}
                disabled={isCreatingCheckout}
              >
                {isCreatingCheckout ? (
                  <ActivityIndicator color={Colors.textInverse} />
                ) : (
                  <Text style={[
                    subscriptionSummary.isTrial ? styles.upgradeButtonText : styles.selectedPlanButtonText
                  ]}>
                    {subscriptionSummary.isTrial ? 'Upgrade Now' : 'Choose Plan'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Trust Indicators */}
        <View style={styles.trustSection}>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🔒</Text>
            <Text style={styles.trustText}>
              {Platform.OS === 'ios' ? 'Purchases handled by Apple' : 'Secure payment processing'}
            </Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>💳</Text>
            <Text style={styles.trustText}>Cancel anytime</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>📱</Text>
            <Text style={styles.trustText}>Works on all devices</Text>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            By starting your free trial, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.padding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  backButtonText: {
    fontSize: Typography.fontSize.h2,
    color: Colors.warmGrayText,
  },
  title: {
    fontSize: Typography.fontSize.h1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.warmGrayText,
  },
  heroSection: {
    paddingHorizontal: Layout.padding,
    paddingBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: Typography.fontSize.h2,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
    lineHeight: Typography.lineHeight.body,
  },
  statusSection: {
    paddingHorizontal: Layout.padding,
    marginBottom: Spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  statusTitle: {
    fontSize: Typography.fontSize.h3,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
    flex: 1,
    marginRight: Spacing.sm,
  },
  refreshButton: {
    backgroundColor: Colors.primarySage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
  },
  refreshButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primarySage,
  },
  statusText: {
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.warmGrayText,
    marginBottom: Spacing.xs,
  },
  statusSubtext: {
    fontSize: Typography.fontSize.small,
    color: Colors.coolGrayText,
  },
  featuresSection: {
    paddingHorizontal: Layout.padding,
    marginBottom: Spacing.lg,
  },
  featuresTitle: {
    fontSize: Typography.fontSize.h3,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  featureIcon: {
    fontSize: Typography.fontSize.body,
    color: Colors.primarySage,
    marginRight: Spacing.sm,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: Typography.fontSize.body,
    color: Colors.warmGrayText,
    flex: 1,
  },
  pricingToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.xs,
    marginHorizontal: Layout.padding,
    marginBottom: Spacing.lg,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.borderRadius.sm,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: Colors.primarySage,
  },
  toggleOptionText: {
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.warmGrayText,
  },
  toggleOptionTextActive: {
    color: Colors.textInverse,
  },
  plansContainer: {
    paddingHorizontal: Layout.padding,
    marginBottom: Spacing.lg,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  selectedPlanCard: {
    borderWidth: 2,
    borderColor: Colors.primarySage,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  planName: {
    fontSize: Typography.fontSize.h3,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
    flexShrink: 1,
    marginRight: Spacing.sm,
  },
  trialRibbon: {
    backgroundColor: Colors.primarySage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  trialRibbonText: {
    fontSize: Typography.fontSize.small,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textInverse,
  },
  savingsBadge: {
    backgroundColor: Colors.secondaryCoral,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  savingsText: {
    fontSize: Typography.fontSize.small,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textInverse,
  },
  planPricing: {
    marginBottom: Spacing.md,
  },
  planPrice: {
    fontSize: Typography.fontSize.h2,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.warmGrayText,
  },
  planPeriod: {
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
  },
  planDescription: {
    display: 'none',
  },
  planButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primarySage,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  planButtonDisabled: {
    opacity: 0.6,
  },
  selectedPlanButton: {
    backgroundColor: Colors.primarySage,
    borderColor: Colors.primarySage,
  },
  planButtonText: {
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.primarySage,
  },
  selectedPlanButtonText: {
    color: Colors.textInverse,
  },
  planNote: {
    fontSize: Typography.fontSize.small,
    color: Colors.coolGrayText,
    textAlign: 'center',
  },
  trustSection: {
    paddingHorizontal: Layout.padding,
    marginBottom: Spacing.lg,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  trustIcon: {
    fontSize: Typography.fontSize.body,
    marginRight: Spacing.sm,
  },
  trustText: {
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
  },
  termsSection: {
    paddingHorizontal: Layout.padding,
    paddingBottom: Spacing.xl,
  },
  termsText: {
    fontSize: Typography.fontSize.small,
    color: Colors.coolGrayText,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.small,
  },
  // New styles for current plan and recommended plan
  currentPlanCard: {
    borderWidth: 2,
    borderColor: Colors.primarySage,
    backgroundColor: Colors.primarySage + '10', // Semi-transparent sage background
  },
  currentPlanBadge: {
    backgroundColor: Colors.primarySage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  currentPlanBadgeText: {
    fontSize: Typography.fontSize.small,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textInverse,
  },
  currentPlanInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  currentPlanStatus: {
    fontSize: Typography.fontSize.h4,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.primarySage,
    marginBottom: Spacing.xs,
  },
  currentPlanDays: {
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
  },
  recommendedPlanCard: {
    borderWidth: 2,
    borderColor: Colors.secondaryCoral,
  },
  recommendedBadge: {
    backgroundColor: Colors.secondaryCoral,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
  },
  recommendedBadgeText: {
    fontSize: Typography.fontSize.small,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textInverse,
  },
  upgradeButton: {
    backgroundColor: Colors.secondaryCoral,
    borderColor: Colors.secondaryCoral,
  },
  upgradeButtonText: {
    color: Colors.textInverse,
  },
  // Trial expired banner styles
  trialExpiredBanner: {
    backgroundColor: Colors.secondaryCoral + '15', // Semi-transparent coral
    borderWidth: 1,
    borderColor: Colors.secondaryCoral,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.lg,
    marginHorizontal: Layout.padding,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trialExpiredContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trialExpiredIcon: {
    fontSize: Typography.fontSize.h2,
    marginRight: Spacing.md,
  },
  trialExpiredText: {
    flex: 1,
  },
  trialExpiredTitle: {
    fontSize: Typography.fontSize.h4,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.secondaryCoral,
    marginBottom: Spacing.xs,
  },
  trialExpiredSubtitle: {
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
  },
  trialExpiredButton: {
    backgroundColor: Colors.secondaryCoral,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    marginLeft: Spacing.md,
  },
  trialExpiredButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
  },
  // Subscription Management Styles
  managementSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  managementTitle: {
    fontSize: Typography.fontSize.h4,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
    marginBottom: Spacing.md,
  },
  managementButtons: {
    gap: Spacing.sm,
  },
  managementButton: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  managementButtonText: {
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.warmGrayText,
  },
  restoreSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  restoreButton: {
    backgroundColor: 'transparent',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primarySage,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: Typography.fontSize.small,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.primarySage,
  },
});

export default SubscriptionScreen;
