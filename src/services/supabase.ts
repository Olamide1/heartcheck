import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// These will be set in environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

// Check if we have valid Supabase credentials
const hasValidCredentials = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string) => {
    if (!hasValidCredentials) {
      return { 
        data: null, 
        error: { message: 'Supabase not configured. Please set environment variables.' } 
      };
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { data, error };
    } catch (error) {
      return { data: null, error: { message: 'Authentication service unavailable' } };
    }
  },

  signIn: async (email: string, password: string) => {
    if (!hasValidCredentials) {
      return { 
        data: null, 
        error: { message: 'Supabase not configured. Please set environment variables.' } 
      };
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (error) {
      return { data: null, error: { message: 'Authentication service unavailable' } };
    }
  },

  signOut: async () => {
    if (!hasValidCredentials) {
      return { error: { message: 'Supabase not configured' } };
    }
    
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error: { message: 'Sign out failed' } };
    }
  },

  getCurrentUser: async () => {
    if (!hasValidCredentials) {
      return { user: null, error: { message: 'Supabase not configured' } };
    }
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return { user, error };
    } catch (error) {
      return { user: null, error: { message: 'Failed to get user' } };
    }
  },

  resendConfirmation: async (email: string) => {
    if (!hasValidCredentials) {
      return { error: { message: 'Supabase not configured' } };
    }
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      return { error };
    } catch (error) {
      return { error: { message: 'Failed to resend confirmation' } };
    }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    if (!hasValidCredentials) {
      // Return a dummy subscription that does nothing
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
    
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database helpers
export const db = {
  // User operations
  createUser: async (userData: Partial<User>) => {
    if (!hasValidCredentials) {
      return { data: null, error: { message: 'Database not configured' } };
    }
    
    try {
      // Ensure we have a valid user ID from auth
      if (!userData.id) {
        return { data: null, error: { message: 'User ID is required' } };
      }

      // Map camelCase fields to snake_case database columns
      const dbUserData = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        nickname: null, // Will be collected later in profile
        relationship_start_date: userData.relationshipStartDate, // Map to snake_case
        timezone: userData.timezone,
      };

      console.log('Attempting to create user with data:', dbUserData);

      // Direct table insert with proper RLS policies
      const { data, error } = await supabase
        .from('users')
        .insert([dbUserData])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        
        // If it's an RLS error, provide more specific guidance
        if (error.code === '42501') {
          return { 
            data: null, 
            error: { 
              message: 'Permission denied. Please ensure you are properly authenticated and try again.' 
            } 
          };
        }
        
        return { data: null, error };
      }

      console.log('User created successfully:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Database error:', error);
      return { data: null, error: { message: 'Database operation failed' } };
    }
  },

  updateUser: async (id: string, updates: Partial<User>) => {
    if (!hasValidCredentials) {
      return { data: null, error: { message: 'Database not configured' } };
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    } catch (error) {
      return { data: null, error: { message: 'Database operation failed' } };
    }
  },

  getUser: async (id: string) => {
    if (!hasValidCredentials) {
      return { data: null, error: { message: 'Database not configured' } };
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    } catch (error) {
      return { data: null, error: { message: 'Database operation failed' } };
    }
  },

  // Couple operations
  createCouple: async (coupleData: Partial<Couple>) => {
    if (!hasValidCredentials) {
      return { data: null, error: { message: 'Database not configured' } };
    }
    
    try {
      const { data, error } = await supabase
        .from('couples')
        .insert([coupleData])
        .select()
        .single();
      return { data, error };
    } catch (error) {
      return { data: null, error: { message: 'Database operation failed' } };
    }
  },

  getCouple: async (userId: string) => {
    if (!hasValidCredentials) {
      return { data: null, error: { message: 'Database not configured' } };
    }
    
    try {
      const { data, error } = await supabase
        .from('couples')
        .select('*')
        .or(`partner1_id.eq.${userId},partner2_id.eq.${userId}`)
        .maybeSingle();

      // If no couple exists yet, return null data without treating as an error
      if (!data && !error) {
        return { data: null, error: null };
      }

      if (error) {
        return { data: null, error };
      }

      if (data) {
        // Map snake_case database fields to camelCase TypeScript interface
        const mappedCouple = {
          id: data.id,
          partner1Id: data.partner1_id,
          partner2Id: data.partner2_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        return { data: mappedCouple, error: null };
      }

      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: { message: 'Database operation failed' } };
    }
  },

  // Check-in operations
  createCheckIn: async (checkInData: Partial<CheckIn>) => {
    if (!hasValidCredentials) {
      return { data: null, error: { message: 'Database not configured' } };
    }
    
    try {
      // Map camelCase fields to snake_case database columns
      const dbCheckInData = {
        user_id: checkInData.userId,
        couple_id: checkInData.coupleId,
        date: checkInData.date,
        mood_rating: checkInData.moodRating,
        connection_rating: checkInData.connectionRating,
        reflection: checkInData.reflection,
        is_shared: checkInData.isShared,
      };

      console.log('Inserting check-in with mapped data:', dbCheckInData);

      const { data, error } = await supabase
        .from('check_ins')
        .insert([dbCheckInData])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase insert error:', error);
        return { data: null, error };
      }
      
      if (data) {
        // Map snake_case database fields back to camelCase TypeScript interface
        const mappedCheckIn = {
          id: data.id,
          userId: data.user_id,
          coupleId: data.couple_id,
          date: data.date,
          moodRating: data.mood_rating,
          connectionRating: data.connection_rating,
          reflection: data.reflection,
          isShared: data.is_shared,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        return { data: mappedCheckIn, error: null };
      }
      
      return { data: null, error: { message: 'No data returned from insert' } };
    } catch (error) {
      return { data: null, error: { message: 'Database operation failed' } };
    }
  },

  getCheckIns: async (coupleId: string, limit = 30) => {
    if (!hasValidCredentials) {
      return { data: null, error: { message: 'Database not configured' } };
    }
    
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('couple_id', coupleId)
        .order('date', { ascending: false })
        .limit(limit);
      return { data, error };
    } catch (error) {
      return { data: null, error: { message: 'Database operation failed' } };
    }
  },

  getCheckInsByDate: async (coupleId: string, date: string) => {
    if (!hasValidCredentials) {
      return { data: null, error: { message: 'Database not configured' } };
    }
    
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('date', date);
      return { data, error };
    } catch (error) {
      return { data: null, error: { message: 'Database operation failed' } };
    }
  },
};

// Import types
import { User, Couple, CheckIn } from '../types';
