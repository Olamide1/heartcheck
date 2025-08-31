import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Colors, Typography, Spacing, Layout } from '../../constants';

const { width } = Dimensions.get('window');

const SubscriptionScreen = ({ navigation }: any) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  const plans = {
    monthly: {
      price: 6.99,
      period: 'month',
      savings: null,
    },
    annual: {
      price: 59.99,
      period: 'year',
      savings: 'Save 28%',
    },
  };

  const features = [
    'Daily private check-ins',
    'Pattern detection & alerts',
    'Monthly relationship reports',
    'Guided exercises & tips',
    'Partner connection insights',
    'Data export & backup',
  ];

  const handleSubscribe = (plan: 'monthly' | 'annual') => {
    // TODO: Implement Stripe subscription
    console.log('Subscribe to:', plan);
    Alert.alert(
      'Subscription',
      `Starting ${plan} subscription...`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

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

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What's included:</Text>
          {features.map((feature, index) => (
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
          {/* Free Trial Plan */}
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Free Trial</Text>
              <View style={styles.trialRibbon}>
                <Text style={styles.trialRibbonText}>7 Days</Text>
              </View>
            </View>
            
            <View style={styles.planPricing}>
              <Text style={styles.planPrice}>$0</Text>
              <Text style={styles.planPeriod}>for 7 days</Text>
            </View>
            
            <Text style={styles.planDescription}>
              Try all premium features free for 7 days
            </Text>
            
            <TouchableOpacity
              style={styles.planButton}
              onPress={() => handleSubscribe(selectedPlan)}
              activeOpacity={0.8}
            >
              <Text style={styles.planButtonText}>Start Free Trial</Text>
            </TouchableOpacity>
            
            <Text style={styles.planNote}>
              Then ${plans[selectedPlan].price}/{plans[selectedPlan].period}
            </Text>
          </View>

          {/* Selected Plan */}
          <View style={[styles.planCard, styles.selectedPlanCard]}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>
                {selectedPlan === 'monthly' ? 'Monthly' : 'Annual'} Plan
              </Text>
              {plans[selectedPlan].savings && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>{plans[selectedPlan].savings}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.planPricing}>
              <Text style={styles.planPrice}>${plans[selectedPlan].price}</Text>
              <Text style={styles.planPeriod}>per {plans[selectedPlan].period}</Text>
            </View>
            
            <Text style={styles.planDescription}>
              {selectedPlan === 'annual' 
                ? 'Best value - save 28% compared to monthly'
                : 'Flexible monthly billing'
              }
            </Text>
            
            <TouchableOpacity
              style={[styles.planButton, styles.selectedPlanButton]}
              onPress={() => handleSubscribe(selectedPlan)}
              activeOpacity={0.8}
            >
              <Text style={styles.selectedPlanButtonText}>Choose Plan</Text>
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
            <Text style={styles.trustIcon}>🔄</Text>
            <Text style={styles.trustText}>Cancel anytime</Text>
          </View>
          
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>💬</Text>
            <Text style={styles.trustText}>24/7 customer support</Text>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            By starting your free trial, you agree to our Terms of Service and Privacy Policy. 
            Your subscription will automatically renew unless canceled at least 24 hours before 
            the end of the current period.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softCream,
  },
  scrollView: {
    flex: 1,
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
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  backButtonText: {
    fontSize: 20,
    color: Colors.warmGrayText,
  },
  title: {
    fontSize: Typography.fontSize.h1,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: Layout.padding,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: Typography.fontSize.h1,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: Typography.lineHeight.h1,
  },
  heroSubtitle: {
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.body,
  },
  featuresSection: {
    paddingHorizontal: Layout.padding,
    marginBottom: Spacing.xl,
  },
  featuresTitle: {
    fontSize: Typography.fontSize.h2,
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
    fontSize: 20,
    color: Colors.successTeal,
    marginRight: Spacing.md,
    fontWeight: Typography.fontWeight.bold,
  },
  featureText: {
    fontSize: Typography.fontSize.body,
    color: Colors.warmGrayText,
    flex: 1,
  },
  pricingToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Layout.padding,
    marginBottom: Spacing.lg,
    borderRadius: Layout.borderRadius.medium,
    padding: Spacing.xs,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.borderRadius.small,
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
    color: Colors.white,
  },
  plansContainer: {
    paddingHorizontal: Layout.padding,
    marginBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  planCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: Layout.borderRadius.large,
    shadowColor: Colors.black,
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
    fontSize: Typography.fontSize.h2,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
  },
  trialRibbon: {
    backgroundColor: Colors.blushPink,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.small,
  },
  trialRibbonText: {
    fontSize: Typography.fontSize.small,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.warmGrayText,
  },
  savingsBadge: {
    backgroundColor: Colors.successTeal,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.small,
  },
  savingsText: {
    fontSize: Typography.fontSize.small,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.white,
  },
  planPricing: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  planPrice: {
    fontSize: 48,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primarySage,
    marginBottom: Spacing.xs,
  },
  planPeriod: {
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
  },
  planDescription: {
    fontSize: Typography.fontSize.body,
    color: Colors.warmGrayText,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeight.body,
  },
  planButton: {
    backgroundColor: Colors.primarySage,
    height: Layout.buttonHeight,
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedPlanButton: {
    backgroundColor: Colors.successTeal,
  },
  planButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
  },
  selectedPlanButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
  },
  planNote: {
    fontSize: Typography.fontSize.small,
    color: Colors.coolGrayText,
    textAlign: 'center',
  },
  trustSection: {
    paddingHorizontal: Layout.padding,
    marginBottom: Spacing.xl,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  trustIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
  },
  trustText: {
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
    flex: 1,
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
});

export default SubscriptionScreen;
