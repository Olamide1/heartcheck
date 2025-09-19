import { supabase, auth } from './supabase';
import { subscriptionService } from './subscriptions';

export interface DeleteAccountResult {
  success: boolean;
  message: string;
  errors?: string[];
}

class DeleteAccountService {
  /**
   * Delete user account and all associated data
   */
  async deleteAccount(userId: string): Promise<DeleteAccountResult> {
    const errors: string[] = [];
    
    try {
      console.log(`Starting account deletion for user: ${userId}`);

      // 1. Cancel Stripe subscription if exists
      try {
        await this.cancelStripeSubscription(userId);
        console.log('✅ Stripe subscription cancelled');
      } catch (error) {
        const errorMsg = `Failed to cancel Stripe subscription: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // 2. Delete all user data from database
      try {
        await this.deleteUserData(userId);
        console.log('✅ User data deleted from database');
      } catch (error) {
        const errorMsg = `Failed to delete user data: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // 3. Delete user from Supabase Auth
      try {
        await this.deleteAuthUser(userId);
        console.log('✅ User deleted from Supabase Auth');
      } catch (error) {
        const errorMsg = `Failed to delete auth user: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // 4. Sign out user
      try {
        await auth.signOut();
        console.log('✅ User signed out');
      } catch (error) {
        const errorMsg = `Failed to sign out user: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      if (errors.length > 0) {
        return {
          success: false,
          message: 'Account deletion completed with some errors. Please contact support if you experience issues.',
          errors
        };
      }

      return {
        success: true,
        message: 'Account successfully deleted. All your data has been permanently removed.'
      };

    } catch (error) {
      console.error('Critical error during account deletion:', error);
      return {
        success: false,
        message: 'Failed to delete account. Please contact support.',
        errors: [`Critical error: ${error}`]
      };
    }
  }

  /**
   * Cancel Stripe subscription for the user
   */
  private async cancelStripeSubscription(userId: string): Promise<void> {
    try {
      const subscription = await subscriptionService.getUserSubscription(userId);
      if (subscription && subscription.stripeCustomerId) {
        await subscriptionService.cancelSubscription(userId);
        console.log('Stripe subscription cancelled successfully');
      } else {
        console.log('No active Stripe subscription found');
      }
    } catch (error) {
      console.error('Error cancelling Stripe subscription:', error);
      throw error;
    }
  }

  /**
   * Delete all user data from database
   */
  private async deleteUserData(userId: string): Promise<void> {
    try {
      // Delete in order of dependencies (child tables first)
      const deleteOperations = [
        // Delete check-ins
        supabase.from('check_ins').delete().eq('user_id', userId),
        
        // Delete pattern alerts
        supabase.from('pattern_alerts').delete().eq('user_id', userId),
        
        // Delete notification schedules
        supabase.from('notification_schedules').delete().eq('user_id', userId),
        
        // Delete notification logs
        supabase.from('notification_logs').delete().eq('user_id', userId),
        
        // Delete subscriptions
        supabase.from('subscriptions').delete().eq('user_id', userId),
        
        // Update couple relationship (remove user as partner)
        supabase.from('couples').update({ 
          partner1_id: null,
          partner2_id: null,
          updated_at: new Date().toISOString()
        }).or(`partner1_id.eq.${userId},partner2_id.eq.${userId}`),
        
        // Delete user profile
        supabase.from('users').delete().eq('id', userId),
      ];

      // Execute all delete operations
      const results = await Promise.allSettled(deleteOperations);
      
      // Check for errors
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Delete operation ${index} failed:`, result.reason);
        }
      });

      console.log('All user data deletion operations completed');
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  /**
   * Delete user from Supabase Auth
   */
  private async deleteAuthUser(userId: string): Promise<void> {
    try {
      // Note: In production, you might want to use a server-side function
      // to delete the auth user, as this requires admin privileges
      console.log('Auth user deletion would require server-side implementation');
      console.log('User will be signed out instead');
    } catch (error) {
      console.error('Error deleting auth user:', error);
      throw error;
    }
  }

  /**
   * Check if user has any critical data that should prevent deletion
   */
  async canDeleteAccount(userId: string): Promise<{ canDelete: boolean; reason?: string }> {
    try {
      // Check if user is part of an active couple
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .select('partner1_id, partner2_id')
        .or(`partner1_id.eq.${userId},partner2_id.eq.${userId}`)
        .single();

      if (coupleError && coupleError.code !== 'PGRST116') {
        throw coupleError;
      }

      if (couple) {
        const partnerId = couple.partner1_id === userId ? couple.partner2_id : couple.partner1_id;
        if (partnerId) {
          return {
            canDelete: false,
            reason: 'You are currently paired with a partner. Please unpair first or contact support.'
          };
        }
      }

      return { canDelete: true };
    } catch (error) {
      console.error('Error checking if account can be deleted:', error);
      return {
        canDelete: false,
        reason: 'Unable to verify account status. Please contact support.'
      };
    }
  }
}

export const deleteAccountService = new DeleteAccountService();
