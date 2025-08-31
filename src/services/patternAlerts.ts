import { supabase } from './supabase';
import { 
  PatternAlert, 
  PatternAlertType, 
  PatternDetectionRule, 
  PatternAlertPreferences,
  PatternDetectionResult,
  CheckIn 
} from '../types';

export class PatternAlertsService {
  private static instance: PatternAlertsService;

  private constructor() {}

  static getInstance(): PatternAlertsService {
    if (!PatternAlertsService.instance) {
      PatternAlertsService.instance = new PatternAlertsService();
    }
    return PatternAlertsService.instance;
  }

  /**
   * Check for patterns and generate alerts for a couple
   */
  async checkForPatterns(coupleId: string, userId: string): Promise<PatternDetectionResult[]> {
    try {
      console.log(`Checking for patterns for couple ${coupleId}`);
      
      // Get all check-ins for the couple (both partners)
      const { data: checkIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('couple_id', coupleId)
        .order('date', { ascending: true });

      if (checkInsError || !checkIns) {
        console.error('Failed to fetch check-ins for pattern detection:', checkInsError);
        return [];
      }

      // Map database fields to TypeScript interface
      const mappedCheckIns: CheckIn[] = checkIns.map(checkIn => ({
        id: checkIn.id,
        userId: checkIn.user_id,
        coupleId: checkIn.couple_id,
        date: checkIn.date,
        moodRating: checkIn.mood_rating,
        connectionRating: checkIn.connection_rating,
        reflection: checkIn.reflection,
        isShared: checkIn.is_shared,
        createdAt: checkIn.created_at,
        updatedAt: checkIn.updated_at,
      }));

      // Get active pattern detection rules
      const { data: rules, error: rulesError } = await supabase
        .from('pattern_detection_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (rulesError || !rules) {
        console.error('Failed to fetch pattern detection rules:', rulesError);
        return [];
      }

      const results: PatternDetectionResult[] = [];

      // Check each rule against the check-in data
      for (const rule of rules) {
        const result = await this.evaluateRule(rule, mappedCheckIns, coupleId, userId);
        if (result.shouldAlert) {
          results.push(result);
        }
      }

      console.log(`Pattern detection completed: ${results.length} alerts generated`);
      return results;
    } catch (error) {
      console.error('Error checking for patterns:', error);
      return [];
    }
  }

  /**
   * Evaluate a specific rule against check-in data
   */
  private async evaluateRule(
    rule: PatternDetectionRule, 
    checkIns: CheckIn[], 
    coupleId: string, 
    userId: string
  ): Promise<PatternDetectionResult> {
    try {
      const conditions = rule.conditions;
      const metric = conditions.metric;
      const threshold = conditions.threshold;
      const consecutiveDays = conditions.consecutive_days;
      const operator = conditions.operator;

      // Group check-ins by user and sort by date
      const userCheckIns = checkIns.filter(ci => ci.userId === userId);
      const sortedCheckIns = userCheckIns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Check for consecutive days pattern
      let consecutiveCount = 0;
      let currentStreak = 0;
      let maxStreak = 0;

      for (let i = 0; i < sortedCheckIns.length; i++) {
        const checkIn = sortedCheckIns[i];
        const value = metric === 'mood_rating' ? checkIn.moodRating : checkIn.connectionRating;
        
        if (this.evaluateCondition(value, threshold, operator)) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
          
          if (currentStreak >= consecutiveDays) {
            consecutiveCount++;
          }
        } else {
          currentStreak = 0;
        }
      }

      // Check if we should generate an alert
      if (consecutiveCount > 0) {
        return this.generateAlertResult(rule, conditions, maxStreak, coupleId, userId);
      }

      return {
        shouldAlert: false,
        alertType: rule.ruleType,
        title: '',
        message: '',
        suggestedAction: '',
        severity: 'low',
        patternData: null,
      };
    } catch (error) {
      console.error('Error evaluating rule:', error);
      return {
        shouldAlert: false,
        alertType: rule.ruleType,
        title: '',
        message: '',
        suggestedAction: '',
        severity: 'low',
        patternData: null,
      };
    }
  }

  /**
   * Evaluate a condition (e.g., value <= threshold)
   */
  private evaluateCondition(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case '<=':
        return value <= threshold;
      case '>=':
        return value >= threshold;
      case '<':
        return value < threshold;
      case '>':
        return value > threshold;
      case '==':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * Generate alert result based on rule and pattern data
   */
  private generateAlertResult(
    rule: PatternDetectionRule, 
    conditions: any, 
    streak: number, 
    coupleId: string, 
    userId: string
  ): PatternDetectionResult {
    const metric = conditions.metric;
    const threshold = conditions.threshold;
    const consecutiveDays = conditions.consecutive_days;

    let title = '';
    let message = '';
    let suggestedAction = '';
    let severity: 'low' | 'medium' | 'high' = 'medium';

    switch (rule.ruleType) {
      case 'low_connection':
        title = 'Connection Pattern Detected';
        message = `You've had ${consecutiveDays}+ consecutive days with connection ratings ≤${threshold}/10. This might indicate a need for more quality time together.`;
        suggestedAction = 'Plan a date night or try a new activity together to reconnect.';
        severity = 'medium';
        break;

      case 'low_mood':
        title = 'Mood Pattern Detected';
        message = `You've had ${consecutiveDays}+ consecutive days with mood ratings ≤${threshold}/10. Consider what might be affecting your overall well-being.`;
        suggestedAction = 'Take time for self-care and consider talking to your partner about what\'s on your mind.';
        severity = 'high';
        break;

      case 'streak_achieved':
        title = 'Achievement Unlocked! 🎉';
        message = `Congratulations! You've maintained ${consecutiveDays}+ consecutive days with ${metric === 'mood_rating' ? 'mood' : 'connection'} ratings ≥${threshold}/10.`;
        suggestedAction = 'Celebrate this win together and keep up the great work!';
        severity = 'low';
        break;

      default:
        title = 'Pattern Detected';
        message = `A pattern has been detected in your ${metric.replace('_', ' ')} data.`;
        suggestedAction = 'Review your recent check-ins and reflect on what this pattern might mean.';
        severity = 'medium';
    }

    return {
      shouldAlert: true,
      alertType: rule.ruleType,
      title,
      message,
      suggestedAction,
      severity,
      patternData: {
        metric,
        threshold,
        consecutiveDays,
        currentStreak: streak,
        ruleName: rule.ruleName,
      },
    };
  }

  /**
   * Create a pattern alert in the database
   */
  async createPatternAlert(alertData: Omit<PatternAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<PatternAlert | null> {
    try {
      const { data, error } = await supabase
        .from('pattern_alerts')
        .insert({
          couple_id: alertData.coupleId,
          user_id: alertData.userId,
          type: alertData.type,
          title: alertData.title,
          message: alertData.message,
          suggested_action: alertData.suggestedAction,
          pattern_data: alertData.patternData,
          severity: alertData.severity,
          is_read: alertData.isRead,
          is_dismissed: alertData.isDismissed,
          expires_at: alertData.expiresAt,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create pattern alert:', error);
        return null;
      }

      // Map database response back to TypeScript interface
      const mappedAlert: PatternAlert = {
        id: data.id,
        coupleId: data.couple_id,
        userId: data.user_id,
        type: data.type,
        title: data.title,
        message: data.message,
        suggestedAction: data.suggested_action,
        patternData: data.pattern_data,
        severity: data.severity,
        isRead: data.is_read,
        isDismissed: data.is_dismissed,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      console.log(`Pattern alert created: ${mappedAlert.title}`);
      return mappedAlert;
    } catch (error) {
      console.error('Error creating pattern alert:', error);
      return null;
    }
  }

  /**
   * Get active alerts for a couple
   */
  async getActiveAlerts(coupleId: string): Promise<PatternAlert[]> {
    try {
      const { data, error } = await supabase
        .from('pattern_alerts')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('is_dismissed', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.error('Failed to fetch active alerts:', error);
        return [];
      }

      // Map database response to TypeScript interface
      return data.map(alert => ({
        id: alert.id,
        coupleId: alert.couple_id,
        userId: alert.user_id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        suggestedAction: alert.suggested_action,
        patternData: alert.pattern_data,
        severity: alert.severity,
        isRead: alert.is_read,
        isDismissed: alert.is_dismissed,
        expiresAt: alert.expires_at,
        createdAt: alert.created_at,
        updatedAt: alert.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching active alerts:', error);
      return [];
    }
  }

  /**
   * Mark an alert as read
   */
  async markAlertAsRead(alertId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pattern_alerts')
        .update({
          is_read: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to mark alert as read:', error);
        return false;
      }

      console.log(`Alert ${alertId} marked as read`);
      return true;
    } catch (error) {
      console.error('Error marking alert as read:', error);
      return false;
    }
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pattern_alerts')
        .update({
          is_dismissed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to dismiss alert:', error);
        return false;
      }

      console.log(`Alert ${alertId} dismissed`);
      return true;
    } catch (error) {
      console.error('Error dismissing alert:', error);
      return false;
    }
  }

  /**
   * Get user's alert preferences
   */
  async getAlertPreferences(userId: string): Promise<PatternAlertPreferences[]> {
    try {
      const { data, error } = await supabase
        .from('pattern_alert_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error || !data) {
        console.error('Failed to fetch alert preferences:', error);
        return [];
      }

      return data.map(pref => ({
        id: pref.id,
        userId: pref.user_id,
        alertType: pref.alert_type,
        enabled: pref.enabled,
        notificationEnabled: pref.notification_enabled,
        emailEnabled: pref.email_enabled,
        createdAt: pref.created_at,
        updatedAt: pref.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching alert preferences:', error);
      return [];
    }
  }

  /**
   * Update alert preferences
   */
  async updateAlertPreferences(
    userId: string, 
    alertType: PatternAlertType, 
    preferences: Partial<Omit<PatternAlertPreferences, 'id' | 'userId' | 'alertType' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pattern_alert_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('alert_type', alertType);

      if (error) {
        console.error('Failed to update alert preferences:', error);
        return false;
      }

      console.log(`Alert preferences updated for user ${userId}, type ${alertType}`);
      return true;
    } catch (error) {
      console.error('Error updating alert preferences:', error);
      return false;
    }
  }
}

// Export singleton instance
export const patternAlertsService = PatternAlertsService.getInstance();
