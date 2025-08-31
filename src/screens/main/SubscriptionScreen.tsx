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
import { supabase } from '../../services/supabase';

const { width } = Dimensions.get('window');

const SubscriptionScreen = ({ navigation }: any) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [subscriptionSummary, setSubscriptionSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async (retryCount = 0) => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }
      
      setCurrentUser(user);
      
      // Get subscription summary
      const summary = await subscriptionService.getSubscriptionSummary(user.id);
      setSubscriptionSummary(summary);
      
      console.log('Subscription data loaded successfully:', summary);
      
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      
      // Retry logic for subscription loading
      if (retryCount < 2) {
        console.log(`Retrying subscription load (attempt ${retryCount + 1})`);
        setTimeout(() => {
          loadSubscriptionData(retryCount + 1);
        }, 1000);
      } else {
        console.error('Max retries reached for subscription loading');
        Alert.alert(
          'Error', 
          'Unable to load subscription data. Please restart the app and try again.',
          [
            { text: 'OK' },
            { text: 'Retry', onPress: () => loadSubscriptionData(0) }
          ]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    if (!currentUser) {
      Alert.alert('Error', 'Please sign in to subscribe');
      return;
    }

    try {
      console.log(`Starting subscription upgrade to ${plan} plan for user ${currentUser.id}`);
      
      // Simulate subscription upgrade
      await subscriptionService.upgradeToPlan(currentUser.id, plan);
      
      console.log('Subscription upgrade successful');
      
      Alert.alert(
        'Subscription Updated!',
        `You've successfully upgraded to the ${plan} plan.`,
        [
          {
            text: 'Great!',
            onPress: () => {
              loadSubscriptionData(); // Refresh data
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Subscription error:', error);
      
      // More specific error messages
      let errorMessage = 'Failed to update subscription. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('No subscription found')) {
          errorMessage = 'Setting up your subscription... Please try again.';
        } else if (error.message.includes('database')) {
          errorMessage = 'Database connection issue. Please check your internet and try again.';
        }
      }
      
      Alert.alert('Error', errorMessage);
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
            <Text style={styles.statusTitle}>Your Current Status</Text>
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
            
            {!subscriptionSummary.isTrial ? (
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
            ) : (
              <View style={styles.currentPlanInfo}>
                <Text style={styles.currentPlanStatus}>🎉 Trial Active</Text>
                <Text style={styles.currentPlanDays}>{subscriptionSummary.trialDaysRemaining} days left</Text>
              </View>
            )}
          </View>

          {/* Selected Plan */}
          <View style={[
            styles.planCard, 
            styles.selectedPlanCard,
            !subscriptionSummary.isTrial && styles.recommendedPlanCard
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
              {!subscriptionSummary.isTrial && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>Recommended</Text>
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
            
            <TouchableOpacity
              style={[
                styles.planButton, 
                subscriptionSummary.isTrial ? styles.upgradeButton : styles.selectedPlanButton
              ]}
              onPress={() => handleSubscribe(selectedPlan)}
              activeOpacity={0.8}
            >
              <Text style={[
                subscriptionSummary.isTrial ? styles.upgradeButtonText : styles.selectedPlanButtonText
              ]}>
                {subscriptionSummary.isTrial ? 'Upgrade Now' : 'Choose Plan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trust Indicators */}
        <View style={styles.trustSection}>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🔒</Text>
            <Text style={styles.trustText}>Secure payment processing</Text>
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
  statusTitle: {
    fontSize: Typography.fontSize.h3,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
    marginBottom: Spacing.sm,
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
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  },
  planName: {
    fontSize: Typography.fontSize.h3,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
  },
  trialRibbon: {
    backgroundColor: Colors.primarySage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
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
    fontSize: Typography.fontSize.h1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.warmGrayText,
  },
  planPeriod: {
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
  },
  planDescription: {
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
    lineHeight: Typography.lineHeight.body,
    marginBottom: Spacing.lg,
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
});

export default SubscriptionScreen;
