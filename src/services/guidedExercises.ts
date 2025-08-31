import { supabase } from './supabase';
import { 
  GuidedExercise, 
  ExerciseSession, 
  ExerciseRecommendation,
  PatternAlertType 
} from '../types';

export class GuidedExercisesService {
  private static instance: GuidedExercisesService;

  private constructor() {}

  static getInstance(): GuidedExercisesService {
    if (!GuidedExercisesService.instance) {
      GuidedExercisesService.instance = new GuidedExercisesService();
    }
    return GuidedExercisesService.instance;
  }

  /**
   * Get all active guided exercises
   */
  async getAllExercises(): Promise<GuidedExercise[]> {
    try {
      const { data, error } = await supabase
        .from('guided_exercises')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('difficulty', { ascending: true });

      if (error || !data) {
        console.error('Failed to fetch guided exercises:', error);
        return [];
      }

      // Map database response to TypeScript interface
      return data.map(exercise => ({
        id: exercise.id,
        title: exercise.title,
        description: exercise.description,
        duration: exercise.duration,
        category: exercise.category,
        difficulty: exercise.difficulty,
        instructions: exercise.instructions,
        materialsNeeded: exercise.materials_needed || [],
        benefits: exercise.benefits || [],
        whenToUse: exercise.when_to_use,
        isActive: exercise.is_active,
        createdAt: exercise.created_at,
        updatedAt: exercise.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching guided exercises:', error);
      return [];
    }
  }

  /**
   * Get exercises by category
   */
  async getExercisesByCategory(category: GuidedExercise['category']): Promise<GuidedExercise[]> {
    try {
      const { data, error } = await supabase
        .from('guided_exercises')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('difficulty', { ascending: true });

      if (error || !data) {
        console.error('Failed to fetch exercises by category:', error);
        return [];
      }

      return data.map(exercise => ({
        id: exercise.id,
        title: exercise.title,
        description: exercise.description,
        duration: exercise.duration,
        category: exercise.category,
        difficulty: exercise.difficulty,
        instructions: exercise.instructions,
        materialsNeeded: exercise.materials_needed || [],
        benefits: exercise.benefits || [],
        whenToUse: exercise.when_to_use,
        isActive: exercise.is_active,
        createdAt: exercise.created_at,
        updatedAt: exercise.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching exercises by category:', error);
      return [];
    }
  }

  /**
   * Get exercise by ID
   */
  async getExerciseById(exerciseId: string): Promise<GuidedExercise | null> {
    try {
      const { data, error } = await supabase
        .from('guided_exercises')
        .select('*')
        .eq('id', exerciseId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('Failed to fetch exercise by ID:', error);
        return null;
      }

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        duration: data.duration,
        category: data.category,
        difficulty: data.difficulty,
        instructions: data.instructions,
        materialsNeeded: data.materials_needed || [],
        benefits: data.benefits || [],
        whenToUse: data.when_to_use,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error fetching exercise by ID:', error);
      return null;
    }
  }

  /**
   * Get personalized exercise recommendations based on patterns
   */
  async getPersonalizedRecommendations(userId: string, coupleId: string): Promise<ExerciseRecommendation[]> {
    try {
      const { data, error } = await supabase
        .from('exercise_recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('couple_id', coupleId)
        .eq('is_completed', false)
        .gt('expires_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.error('Failed to fetch exercise recommendations:', error);
        return [];
      }

      return data.map(rec => ({
        id: rec.id,
        userId: rec.user_id,
        coupleId: rec.couple_id,
        exerciseId: rec.exercise_id,
        reason: rec.reason,
        priority: rec.priority,
        expiresAt: rec.expires_at,
        isCompleted: rec.is_completed,
        createdAt: rec.created_at,
      }));
    } catch (error) {
      console.error('Error fetching exercise recommendations:', error);
      return [];
    }
  }

  /**
   * Generate exercise recommendations based on pattern alerts
   */
  async generateRecommendationsFromPatterns(
    userId: string, 
    coupleId: string, 
    alertType: PatternAlertType
  ): Promise<ExerciseRecommendation[]> {
    try {
      // Get exercises that match the alert type
      const exercises = await this.getExercisesForAlertType(alertType);
      
      const recommendations: ExerciseRecommendation[] = [];
      
      for (const exercise of exercises) {
        const reason = this.getRecommendationReason(alertType, exercise);
        const priority = this.getRecommendationPriority(alertType, exercise);
        
        // Check if recommendation already exists
        const existingRec = await this.getRecommendationByExercise(userId, coupleId, exercise.id);
        if (!existingRec) {
          const recommendation = await this.createRecommendation({
            userId,
            coupleId,
            exerciseId: exercise.id,
            reason,
            priority,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            isCompleted: false,
          });
          
          if (recommendation) {
            recommendations.push(recommendation);
          }
        }
      }
      
      console.log(`Generated ${recommendations.length} exercise recommendations for ${alertType}`);
      return recommendations;
    } catch (error) {
      console.error('Error generating exercise recommendations:', error);
      return [];
    }
  }

  /**
   * Get exercises that are appropriate for a specific alert type
   */
  private async getExercisesForAlertType(alertType: PatternAlertType): Promise<GuidedExercise[]> {
    const categoryMap: Record<PatternAlertType, GuidedExercise['category'][]> = {
      'low_connection': ['connection', 'quality_time', 'intimacy'],
      'low_mood': ['stress_relief', 'emotional_support', 'gratitude'],
      'streak_achieved': ['connection', 'gratitude', 'quality_time'],
      'pattern_detected': ['communication', 'connection', 'emotional_support'],
      'relationship_insight': ['communication', 'intimacy', 'quality_time'],
    };

    const categories = categoryMap[alertType] || ['connection'];
    const exercises: GuidedExercise[] = [];
    
    for (const category of categories) {
      const categoryExercises = await this.getExercisesByCategory(category);
      exercises.push(...categoryExercises.slice(0, 2)); // Get top 2 from each category
    }
    
    return exercises;
  }

  /**
   * Get recommendation reason based on alert type and exercise
   */
  private getRecommendationReason(alertType: PatternAlertType, exercise: GuidedExercise): string {
    const reasonMap: Record<PatternAlertType, string> = {
      'low_connection': `This exercise can help strengthen your connection and address the pattern we detected.`,
      'low_mood': `This exercise can help improve your mood and provide emotional support.`,
      'streak_achieved': `Great job! This exercise can help you maintain and build on your positive streak.`,
      'pattern_detected': `This exercise can help address the pattern we detected in your relationship.`,
      'relationship_insight': `This exercise can help you explore and understand your relationship better.`,
    };
    
    return reasonMap[alertType] || `This exercise can help improve your relationship.`;
  }

  /**
   * Get recommendation priority based on alert type and exercise
   */
  private getRecommendationPriority(alertType: PatternAlertType, exercise: GuidedExercise): number {
    // Higher priority for more urgent alert types
    const alertPriority: Record<PatternAlertType, number> = {
      'low_connection': 3,
      'low_mood': 4,
      'streak_achieved': 1,
      'pattern_detected': 2,
      'relationship_insight': 2,
    };
    
    // Higher priority for easier exercises
    const difficultyPriority: Record<GuidedExercise['difficulty'], number> = {
      'beginner': 3,
      'intermediate': 2,
      'advanced': 1,
    };
    
    return alertPriority[alertType] + difficultyPriority[exercise.difficulty];
  }

  /**
   * Check if a recommendation already exists
   */
  private async getRecommendationByExercise(
    userId: string, 
    coupleId: string, 
    exerciseId: string
  ): Promise<ExerciseRecommendation | null> {
    try {
      const { data, error } = await supabase
        .from('exercise_recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('couple_id', coupleId)
        .eq('exercise_id', exerciseId)
        .eq('is_completed', false)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        coupleId: data.couple_id,
        exerciseId: data.exercise_id,
        reason: data.reason,
        priority: data.priority,
        expiresAt: data.expires_at,
        isCompleted: data.is_completed,
        createdAt: data.created_at,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a new exercise recommendation
   */
  private async createRecommendation(
    recommendationData: Omit<ExerciseRecommendation, 'id' | 'createdAt'>
  ): Promise<ExerciseRecommendation | null> {
    try {
      const { data, error } = await supabase
        .from('exercise_recommendations')
        .insert({
          user_id: recommendationData.userId,
          couple_id: recommendationData.coupleId,
          exercise_id: recommendationData.exerciseId,
          reason: recommendationData.reason,
          priority: recommendationData.priority,
          expires_at: recommendationData.expiresAt,
          is_completed: recommendationData.isCompleted,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create exercise recommendation:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        coupleId: data.couple_id,
        exerciseId: data.exercise_id,
        reason: data.reason,
        priority: data.priority,
        expiresAt: data.expires_at,
        isCompleted: data.is_completed,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error creating exercise recommendation:', error);
      return null;
    }
  }

  /**
   * Record completion of an exercise
   */
  async recordExerciseSession(
    sessionData: Omit<ExerciseSession, 'id' | 'createdAt'>
  ): Promise<ExerciseSession | null> {
    try {
      const { data, error } = await supabase
        .from('exercise_sessions')
        .insert({
          user_id: sessionData.userId,
          couple_id: sessionData.coupleId,
          exercise_id: sessionData.exerciseId,
          completed_at: sessionData.completedAt,
          duration_minutes: sessionData.durationMinutes,
          rating: sessionData.rating,
          notes: sessionData.notes,
          completed_with_partner: sessionData.completedWithPartner,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to record exercise session:', error);
        return null;
      }

      // Mark recommendation as completed if it exists
      await this.markRecommendationCompleted(sessionData.userId, sessionData.coupleId, sessionData.exerciseId);

      return {
        id: data.id,
        userId: data.user_id,
        coupleId: data.couple_id,
        exerciseId: data.exercise_id,
        completedAt: data.completed_at,
        durationMinutes: data.duration_minutes,
        rating: data.rating,
        notes: data.notes,
        completedWithPartner: data.completed_with_partner,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error recording exercise session:', error);
      return null;
    }
  }

  /**
   * Mark a recommendation as completed
   */
  private async markRecommendationCompleted(
    userId: string, 
    coupleId: string, 
    exerciseId: string
  ): Promise<void> {
    try {
      await supabase
        .from('exercise_recommendations')
        .update({
          is_completed: true,
        })
        .eq('user_id', userId)
        .eq('couple_id', coupleId)
        .eq('exercise_id', exerciseId);
    } catch (error) {
      console.error('Error marking recommendation as completed:', error);
    }
  }

  /**
   * Get user's exercise history
   */
  async getExerciseHistory(userId: string, coupleId: string): Promise<ExerciseSession[]> {
    try {
      const { data, error } = await supabase
        .from('exercise_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('couple_id', coupleId)
        .order('completed_at', { ascending: false });

      if (error || !data) {
        console.error('Failed to fetch exercise history:', error);
        return [];
      }

      return data.map(session => ({
        id: session.id,
        userId: session.user_id,
        coupleId: session.couple_id,
        exerciseId: session.exercise_id,
        completedAt: session.completed_at,
        durationMinutes: session.duration_minutes,
        rating: session.rating,
        notes: session.notes,
        completedWithPartner: session.completed_with_partner,
        createdAt: session.created_at,
      }));
    } catch (error) {
      console.error('Error fetching exercise history:', error);
      return [];
    }
  }

  /**
   * Get exercise statistics for a user
   */
  async getExerciseStats(userId: string, coupleId: string): Promise<{
    totalCompleted: number;
    totalMinutes: number;
    averageRating: number;
    favoriteCategory: string;
    streakDays: number;
  }> {
    try {
      const history = await this.getExerciseHistory(userId, coupleId);
      
      if (history.length === 0) {
        return {
          totalCompleted: 0,
          totalMinutes: 0,
          averageRating: 0,
          favoriteCategory: '',
          streakDays: 0,
        };
      }

      const totalCompleted = history.length;
      const totalMinutes = history.reduce((sum, session) => sum + (session.durationMinutes || 0), 0);
      const ratings = history.filter(session => session.rating).map(session => session.rating!);
      const averageRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;

      // Calculate streak
      let streakDays = 0;
      const sortedHistory = history.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      let currentDate = new Date();
      
      for (const session of sortedHistory) {
        const sessionDate = new Date(session.completedAt);
        const diffTime = currentDate.getTime() - sessionDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          streakDays++;
          currentDate = sessionDate;
        } else {
          break;
        }
      }

      // Get favorite category (most completed)
      const categoryCounts: Record<string, number> = {};
      for (const session of history) {
        const exercise = await this.getExerciseById(session.exerciseId);
        if (exercise) {
          categoryCounts[exercise.category] = (categoryCounts[exercise.category] || 0) + 1;
        }
      }
      
      const favoriteCategory = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

      return {
        totalCompleted,
        totalMinutes,
        averageRating: Math.round(averageRating * 10) / 10,
        favoriteCategory,
        streakDays,
      };
    } catch (error) {
      console.error('Error calculating exercise stats:', error);
      return {
        totalCompleted: 0,
        totalMinutes: 0,
        averageRating: 0,
        favoriteCategory: '',
        streakDays: 0,
      };
    }
  }
}

// Export singleton instance
export const guidedExercisesService = GuidedExercisesService.getInstance();
