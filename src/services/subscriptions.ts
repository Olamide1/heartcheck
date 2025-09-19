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
  async upgradeToPlan(userId: string, plan: 'monthly' | 'annual', stripeCustomerId?: string): Promise<UserSubscription> {
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
      const updateData: any = {
        status: 'active',
        plan: plan,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        trial_end: null, // No more trial
        updated_at: now.toISOString(),
      };

      // Add Stripe customer ID if provided
      if (stripeCustomerId) {
        updateData.stripe_customer_id = stripeCustomerId;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .update(updateData)
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
   * Cancel subscription in both Stripe and database
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No subscription found for user');
      }

      // If we have a Stripe customer ID, cancel in Stripe first
      if (subscription.stripeCustomerId) {
        try {
          await this.cancelStripeSubscription(subscription.stripeCustomerId);
          console.log(`Stripe subscription canceled for user ${userId}`);
        } catch (stripeError) {
          console.error('Failed to cancel Stripe subscription:', stripeError);
          // Continue with database update even if Stripe fails
        }
      } else {
        console.log(`No Stripe customer ID found for user ${userId}, skipping Stripe cancellation`);
      }

      // Update database status
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (error) {
        console.error('Failed to cancel subscription in database:', error);
        throw error;
      }

      console.log(`Subscription canceled for user ${userId}`);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription in Stripe
   */
  private async cancelStripeSubscription(stripeCustomerId: string): Promise<void> {
    try {
      // Get the customer's subscriptions from Stripe
      const response = await fetch('https://api.stripe.com/v1/customers/' + stripeCustomerId + '/subscriptions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to get Stripe subscriptions: ${response.status} ${errorData}`);
      }

      const subscriptions = await response.json();
      
      if (subscriptions.data && subscriptions.data.length > 0) {
        // Cancel the first active subscription
        const activeSubscription = subscriptions.data.find((sub: any) => sub.status === 'active');
        
        if (activeSubscription) {
          const cancelResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${activeSubscription.id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'cancel_at_period_end=true', // Cancel at end of billing period
          });

          if (!cancelResponse.ok) {
            const errorData = await cancelResponse.text();
            throw new Error(`Failed to cancel Stripe subscription: ${cancelResponse.status} ${errorData}`);
          }

          console.log(`Stripe subscription ${activeSubscription.id} marked for cancellation`);
        }
      }
    } catch (error) {
      console.error('Error canceling Stripe subscription:', error);
      throw error;
    }
  }

  /**
   * Get Stripe customer billing management URL
   */
  async createCustomerPortalSession(userId: string): Promise<{ url: string }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No subscription found for user');
      }

      let stripeCustomerId = subscription.stripeCustomerId;

      // If no Stripe customer ID exists, create one
      if (!stripeCustomerId) {
        console.log('No Stripe customer ID found, creating new customer...');
        stripeCustomerId = await this.createStripeCustomer(userId);
        
        // Update subscription with new customer ID
        await supabase
          .from('subscriptions')
          .update({ 
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
        
        console.log(`Created and stored Stripe customer ID: ${stripeCustomerId}`);
      }

      // Get user email for prefilling
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      // Use direct Stripe customer billing link with prefilled email
      const billingUrl = userProfile?.email 
        ? `https://billing.stripe.com/p/login/3cI14ofrjdqraD01hSejK00?prefilled_email=${encodeURIComponent(userProfile.email)}`
        : 'https://billing.stripe.com/p/login/3cI14ofrjdqraD01hSejK00';
      
      console.log('Using direct Stripe billing link:', billingUrl);
      
      return { url: billingUrl };
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      throw error;
    }
  }

  /**
   * Create a Stripe customer for the user
   */
  private async createStripeCustomer(userId: string): Promise<string> {
    try {
      // Get user profile for email
      const { data: profile } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      // Create Stripe customer
      const formDataString = [
        `email=${encodeURIComponent(profile.email)}`,
        `name=${encodeURIComponent(profile.name || '')}`,
        `metadata[user_id]=${encodeURIComponent(userId)}`,
      ].join('&');

      const response = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formDataString,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create Stripe customer: ${response.status} ${errorData}`);
      }

      const customer = await response.json();
      console.log(`Stripe customer created: ${customer.id}`);
      
      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
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
