import { supabase } from './supabase';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'annual';
  features: string[];
}

export interface UserSubscription {
  id: string;
  userId: string;
  stripeCustomerId?: string;
  status: 'trial' | 'active' | 'canceled' | 'past_due' | 'expired';
  plan: 'monthly' | 'annual';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export class SubscriptionService {
  private static instance: SubscriptionService;

  private constructor() {}

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * Available subscription plans
   */
  getAvailablePlans(): SubscriptionPlan[] {
    return [
      {
        id: 'monthly',
        name: 'Monthly',
        price: 6.99,
        interval: 'monthly',
        features: [
          'Daily private check-ins',
          'Pattern detection & alerts',
          'Monthly relationship reports',
          'Guided exercises & tips',
          'Partner connection insights',
          'Data export & backup'
        ]
      },
      {
        id: 'annual',
        name: 'Annual',
        price: 59.99,
        interval: 'annual',
        features: [
          'Daily private check-ins',
          'Pattern detection & alerts',
          'Monthly relationship reports',
          'Guided exercises & tips',
          'Partner connection insights',
          'Data export & backup',
          '2 months free (compared to monthly)'
        ]
      }
    ];
  }

    /**
   * Start free trial for new user
   */
  async startFreeTrial(userId: string): Promise<UserSubscription> {
    try {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7); // 7 days from now
      
      // Map to database snake_case fields
      const subscription = {
        user_id: userId,
        status: 'trial',
        plan: 'monthly', // Default to monthly
        current_period_start: new Date().toISOString(),
        current_period_end: trialEnd.toISOString(),
        trial_end: trialEnd.toISOString(),
      };

      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscription)
        .select()
        .single();

      if (error) {
        console.error('Failed to create free trial:', error);
        throw error;
      }

      // Map database response back to camelCase for TypeScript
      const mappedSubscription: UserSubscription = {
        id: data.id,
        userId: data.user_id,
        stripeCustomerId: data.stripe_customer_id,
        status: data.status,
        plan: data.plan,
        currentPeriodStart: data.current_period_start,
        currentPeriodEnd: data.current_period_end,
        trialEnd: data.trial_end,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      console.log(`Started free trial for user ${userId}, expires ${trialEnd.toLocaleDateString()}`);
      return mappedSubscription;
    } catch (error) {
      console.error('Error starting free trial:', error);
      throw error;
    }
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Failed to get user subscription:', error);
        throw error;
      }

      if (!data) return null;

      // Map database snake_case fields to camelCase for TypeScript
      const mappedSubscription: UserSubscription = {
        id: data.id,
        userId: data.user_id,
        stripeCustomerId: data.stripe_customer_id,
        status: data.status,
        plan: data.plan,
        currentPeriodStart: data.current_period_start,
        currentPeriodEnd: data.current_period_end,
        trialEnd: data.trial_end,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return mappedSubscription;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  /**
   * Check if user has active subscription (trial or paid)
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) return false;

      // Check if trial is still valid
      if (subscription.status === 'trial' && subscription.trialEnd) {
        const trialEndDate = new Date(subscription.trialEnd);
        const now = new Date();
        return now < trialEndDate;
      }

      // Check if paid subscription is active
      return subscription.status === 'active';
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Check if trial is expired
   */
  async isTrialExpired(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription || subscription.status !== 'trial' || !subscription.trialEnd) {
        return false;
      }

      const trialEnd = new Date(subscription.trialEnd);
      const now = new Date();
      return now >= trialEnd;
    } catch (error) {
      console.error('Error checking trial expiration:', error);
      return false;
    }
  }

  /**
   * Check if user should be redirected to upgrade (trial expired or no subscription)
   */
  async shouldRedirectToUpgrade(userId: string): Promise<{
    shouldRedirect: boolean;
    reason: 'no-subscription' | 'trial-expired' | 'none';
    message: string;
  }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return {
          shouldRedirect: true,
          reason: 'no-subscription',
          message: 'Start your free trial to access premium features'
        };
      }

      if (subscription.status === 'trial' && subscription.trialEnd) {
        const trialEnd = new Date(subscription.trialEnd);
        const now = new Date();
        
        if (now >= trialEnd) {
          return {
            shouldRedirect: true,
            reason: 'trial-expired',
            message: 'Your trial has expired. Upgrade now to continue using premium features'
          };
        }
      }

      return {
        shouldRedirect: false,
        reason: 'none',
        message: ''
      };
    } catch (error) {
      console.error('Error checking if user should redirect to upgrade:', error);
      return {
        shouldRedirect: false,
        reason: 'none',
        message: ''
      };
    }
  }

  /**
   * Get trial days remaining
   */
  async getTrialDaysRemaining(userId: string): Promise<number> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription || subscription.status !== 'trial' || !subscription.trialEnd) {
        return 0;
      }

      const trialEnd = new Date(subscription.trialEnd);
      const now = new Date();
      const diffTime = trialEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return Math.max(0, diffDays);
    } catch (error) {
      console.error('Error getting trial days remaining:', error);
      return 0;
    }
  }

  /**
   * Simulate upgrading to paid plan
   */
  async upgradeToPlan(userId: string, plan: 'monthly' | 'annual'): Promise<UserSubscription> {
    try {
      let currentSubscription = await this.getUserSubscription(userId);
      
      // If no subscription exists, create one (for existing users)
      if (!currentSubscription) {
        console.log(`No subscription found for user ${userId}, creating new one`);
        currentSubscription = await this.startFreeTrial(userId);
      }

      // Calculate new period dates
      const now = new Date();
      const periodEnd = new Date(now);
      
      if (plan === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      // Update subscription using database field names
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          plan: plan,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          trial_end: null, // No more trial
          updated_at: now.toISOString(),
        })
        .eq('id', currentSubscription.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to upgrade subscription:', error);
        throw error;
      }

      // Map database response back to camelCase for TypeScript
      const mappedSubscription: UserSubscription = {
        id: data.id,
        userId: data.user_id,
        stripeCustomerId: data.stripe_customer_id,
        status: data.status,
        plan: data.plan,
        currentPeriodStart: data.current_period_start,
        currentPeriodEnd: data.current_period_end,
        trialEnd: data.trial_end,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      console.log(`User ${userId} upgraded to ${plan} plan`);
      return mappedSubscription;
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      throw error;
    }
  }

  /**
   * Simulate canceling subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No subscription found for user');
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (error) {
        console.error('Failed to cancel subscription:', error);
        throw error;
      }

      console.log(`Subscription canceled for user ${userId}`);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Check if trial is expired and needs renewal
   */
  async checkTrialExpiration(): Promise<void> {
    try {
      const now = new Date();
      
      // Find expired trials
      const { data: expiredTrials, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'trial')
        .lt('trial_end', now.toISOString());

      if (error) {
        console.error('Failed to check trial expiration:', error);
        return;
      }

      // Update expired trials to expired status
      for (const trial of expiredTrials || []) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            updated_at: now.toISOString(),
          })
          .eq('id', trial.id);

        console.log(`Trial expired for user ${trial.user_id}`);
      }
    } catch (error) {
      console.error('Error checking trial expiration:', error);
    }
  }

  /**
   * Ensure all users have subscriptions (create free trials for those who don't)
   * Note: This function has limited scope due to RLS - it can only manage the current user's subscription
   */
  async ensureAllUsersHaveSubscriptions(): Promise<void> {
    try {
      console.log('Ensuring current user has subscription...');
      
      // Get current authenticated user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        console.log('No authenticated user found, skipping subscription check');
        return;
      }

      // Only check/ensure subscription for the current user (due to RLS limitations)
      try {
        const subscription = await this.getUserSubscription(currentUser.id);
        if (!subscription) {
          console.log(`Creating free trial for current user ${currentUser.id}`);
          await this.startFreeTrial(currentUser.id);
        } else {
          console.log(`Current user ${currentUser.id} already has subscription: ${subscription.status}`);
        }
      } catch (error) {
        console.error(`Failed to ensure subscription for current user ${currentUser.id}:`, error);
      }

      console.log('Finished ensuring current user has subscription');
    } catch (error) {
      console.error('Error ensuring current user has subscription:', error);
    }
  }

  /**
   * Get subscription summary for user
   */
  async getSubscriptionSummary(userId: string): Promise<{
    hasSubscription: boolean;
    isTrial: boolean;
    trialDaysRemaining: number;
    plan: string | null;
    status: string | null;
    nextBillingDate: string | null;
  }> {
    try {
      let subscription = await this.getUserSubscription(userId);
      
      // If no subscription exists, create a free trial for existing users
      if (!subscription) {
        console.log(`No subscription found for user ${userId}, creating free trial`);
        try {
          subscription = await this.startFreeTrial(userId);
        } catch (error) {
          console.error('Failed to create free trial:', error);
          
          // If RLS is blocking us, return a helpful message
          if (error && typeof error === 'object' && 'code' in error && error.code === '42501') {
            console.log('RLS policy violation - user needs to be authenticated to create subscription');
          }
          
          // Return default state if trial creation fails
          return {
            hasSubscription: false,
            isTrial: false,
            trialDaysRemaining: 0,
            plan: null,
            status: null,
            nextBillingDate: null,
          };
        }
      }

      const isTrial = subscription.status === 'trial';
      const trialDaysRemaining = isTrial ? await this.getTrialDaysRemaining(userId) : 0;
      const nextBillingDate = subscription.currentPeriodEnd;

      return {
        hasSubscription: true,
        isTrial,
        trialDaysRemaining,
        plan: subscription.plan,
        status: subscription.status,
        nextBillingDate,
      };
    } catch (error) {
      console.error('Error getting subscription summary:', error);
      return {
        hasSubscription: false,
        isTrial: false,
        trialDaysRemaining: 0,
        plan: null,
        status: null,
        nextBillingDate: null,
      };
    }
  }
}

// Export singleton instance
export const subscriptionService = SubscriptionService.getInstance();
