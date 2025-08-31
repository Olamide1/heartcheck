import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, db } from '../../services/supabase';
import { CheckIn } from '../../types';

const { width } = Dimensions.get('window');

const DailyCheckInScreen = () => {
  const [moodRating, setMoodRating] = useState(0);
  const [connectionRating, setConnectionRating] = useState(0);
  const [reflection, setReflection] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentCouple, setCurrentCouple] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user and couple data when component mounts
  useEffect(() => {
    loadUserAndCoupleData();
  }, []);

  const loadUserAndCoupleData = async () => {
    try {
      setIsLoading(true);
      
      console.log('Loading user and couple data...');
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        Alert.alert('Error', 'Unable to load user data. Please try again.');
        return;
      }
      
      console.log('User loaded:', { id: user.id, email: user.email });
      setCurrentUser(user);

      // Get couple data
      const { data: couple, error: coupleError } = await db.getCouple(user.id);
      if (coupleError) {
        console.error('Error getting couple:', coupleError);
        // Don't show error if user just doesn't have a partner yet
        if (coupleError.message !== 'No rows returned') {
          Alert.alert('Error', 'Unable to load couple data. Please try again.');
        }
      } else {
        console.log('Couple loaded:', couple);
        setCurrentCouple(couple);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Unable to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingPress = (rating: number, type: 'mood' | 'connection') => {
    if (type === 'mood') {
      setMoodRating(rating);
    } else {
      setConnectionRating(rating);
    }
  };

  const handleSubmit = async () => {
    // Validate form data
    if (moodRating === 0 || connectionRating === 0 || !reflection.trim()) {
      Alert.alert('Missing Information', 'Please complete all fields before submitting.');
      return;
    }

    // Validate ratings are within range
    if (moodRating < 1 || moodRating > 10 || connectionRating < 1 || connectionRating > 10) {
      Alert.alert('Invalid Rating', 'Ratings must be between 1 and 10.');
      return;
    }

    // Validate reflection length
    if (reflection.trim().length < 1) {
      Alert.alert('Invalid Reflection', 'Please provide a reflection.');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'User not authenticated. Please log in again.');
      return;
    }

    if (!currentCouple) {
      Alert.alert('No Partner', 'You need to be connected with a partner to submit check-ins.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create check-in data
      const checkInData: Partial<CheckIn> = {
        userId: currentUser.id,
        coupleId: currentCouple.id,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        moodRating,
        connectionRating,
        reflection: reflection.trim(),
        isShared,
      };

      console.log('Submitting check-in:', checkInData);

      // Save to database
      const { data: savedCheckIn, error: saveError } = await db.createCheckIn(checkInData);
      
      if (saveError) {
        console.error('Error saving check-in:', saveError);
        Alert.alert('Error', `Failed to save check-in: ${saveError.message}`);
        return;
      }

      console.log('Check-in saved successfully:', savedCheckIn);

      // Success! Reset form and show confirmation
      Alert.alert(
        'Check-in Recorded! ✨', 
        isShared 
          ? 'Your partner will be notified of your check-in and can respond.'
          : 'Your check-in has been saved privately.',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Reset form
              setMoodRating(0);
              setConnectionRating(0);
              setReflection('');
              setIsShared(false);
            }
          }
        ]
      );

    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMoodEmoji = (rating: number) => {
    if (rating <= 2) return '😢';
    if (rating <= 4) return '😕';
    if (rating <= 6) return '😐';
    if (rating <= 8) return '😊';
    return '😍';
  };

  const getConnectionEmoji = (rating: number) => {
    if (rating <= 2) return '💔';
    if (rating <= 4) return '💙';
    if (rating <= 6) return '💚';
    if (rating <= 8) return '💛';
    return '❤️';
  };

  const getMoodDescription = (rating: number) => {
    if (rating <= 2) return 'Rough day';
    if (rating <= 4) return 'Could be better';
    if (rating <= 6) return 'Alright';
    if (rating <= 8) return 'Pretty good!';
    return 'Amazing!';
  };

  const getConnectionDescription = (rating: number) => {
    if (rating <= 2) return 'Feeling distant';
    if (rating <= 4) return 'Somewhat connected';
    if (rating <= 6) return 'Connected';
    if (rating <= 8) return 'Very connected';
    return 'Deeply connected!';
  };

  const renderRatingScale = (rating: number, onPress: (rating: number) => void, type: 'mood' | 'connection') => {
    const labels = type === 'mood' 
      ? ['Terrible', 'Bad', 'Poor', 'Fair', 'Okay', 'Good', 'Great', 'Excellent', 'Amazing', 'Perfect']
      : ['Distant', 'Cold', 'Separate', 'Neutral', 'Present', 'Close', 'Warm', 'Intimate', 'United', 'One'];

    return (
      <View style={styles.ratingScaleContainer}>
        <View style={styles.ratingScale}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.ratingScaleItem,
                value <= rating && styles.ratingScaleItemActive,
                value === rating && styles.ratingScaleItemSelected
              ]}
              onPress={() => onPress(value)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.ratingScaleNumber,
                value <= rating && styles.ratingScaleNumberActive
              ]}>
                {value}
              </Text>
              <Text style={[
                styles.ratingScaleLabel,
                value <= rating && styles.ratingScaleLabelActive
              ]}>
                {labels[value - 1]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {rating > 0 && (
          <View style={styles.ratingFeedback}>
            <Text style={styles.ratingFeedbackEmoji}>
              {type === 'mood' ? getMoodEmoji(rating) : getConnectionEmoji(rating)}
            </Text>
            <View style={styles.ratingFeedbackText}>
              <Text style={styles.ratingFeedbackValue}>{rating}/10</Text>
              <Text style={styles.ratingFeedbackDescription}>
                {type === 'mood' ? getMoodDescription(rating) : getConnectionDescription(rating)}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error if no partner
  if (!currentCouple) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>No Partner Connected</Text>
          <Text style={styles.errorDescription}>
            You need to be connected with a partner to submit daily check-ins.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={loadUserAndCoupleData}
          >
            <Text style={styles.errorButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.errorButton, { marginTop: 12, backgroundColor: '#6B7280' }]}
            onPress={() => {
              // Navigate to partner invitation screen
              // This would need navigation prop in a real implementation
              console.log('Navigate to partner invitation');
            }}
          >
            <Text style={styles.errorButtonText}>Connect with Partner</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with gradient background */}
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={['#f0fdf4', '#dcfce7', '#bbf7d0']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Daily Check-In</Text>
              <Text style={styles.subtitle}>How are you feeling today?</Text>
              <Text style={styles.headerDescription}>
                Take a moment to reflect on your day and your connection
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Mood Rating Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>😊</Text>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Mood Rating</Text>
              <Text style={styles.sectionDescription}>
                How would you rate your overall mood today?
              </Text>
            </View>
          </View>
          {renderRatingScale(moodRating, (rating) => handleRatingPress(rating, 'mood'), 'mood')}
        </View>

        {/* Connection Rating Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>💕</Text>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Connection Rating</Text>
              <Text style={styles.sectionDescription}>
                How connected do you feel with your partner today?
              </Text>
            </View>
          </View>
          {renderRatingScale(connectionRating, (rating) => handleRatingPress(rating, 'connection'), 'connection')}
        </View>

        {/* Reflection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>💭</Text>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Reflection</Text>
              <Text style={styles.sectionDescription}>
                Share your thoughts, feelings, or anything you'd like to remember about today
              </Text>
            </View>
          </View>
          
          <View style={styles.reflectionInputContainer}>
            <TextInput
              style={styles.reflectionInput}
              value={reflection}
              onChangeText={setReflection}
              placeholder="What's on your mind today? How are you feeling about your relationship? Any moments you want to remember?"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <View style={styles.characterCountContainer}>
              <Text style={styles.characterCount}>
                {reflection.length}/500
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <View style={styles.privacyContainer}>
            <View style={styles.privacyInfo}>
              <Text style={styles.privacyEmoji}>🔒</Text>
              <View style={styles.privacyText}>
                <Text style={styles.privacyLabel}>Share with Partner</Text>
                <Text style={styles.privacyDescription}>
                  Allow your partner to see this check-in and respond
                </Text>
              </View>
            </View>
            <Switch
              value={isShared}
              onValueChange={setIsShared}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor={isShared ? '#FFFFFF' : '#9CA3AF'}
              ios_backgroundColor="#E5E7EB"
            />
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!moodRating || !connectionRating || !reflection.trim()) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!moodRating || !connectionRating || !reflection.trim() || isSubmitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isSubmitting ? (
                <Text style={styles.submitButtonText}>Recording your check-in... ✨</Text>
              ) : (
                <Text style={styles.submitButtonText}>Submit Check-In ✨</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.submitNote}>
            Your daily check-ins help track your relationship journey
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerContainer: {
    marginBottom: 16,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 6,
  },
  headerDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionEmoji: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  ratingScaleContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ratingScale: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 4,
  },
  ratingScaleItem: {
    width: (width - 72) / 5,
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ratingScaleItemActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  ratingScaleItemSelected: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  ratingScaleNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 1,
  },
  ratingScaleNumberActive: {
    color: '#10B981',
  },
  ratingScaleLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 10,
  },
  ratingScaleLabelActive: {
    color: '#10B981',
  },
  ratingFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  ratingFeedbackEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  ratingFeedbackText: {
    alignItems: 'center',
  },
  ratingFeedbackValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 2,
  },
  ratingFeedbackDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  reflectionInputContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  reflectionInput: {
    height: 90,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  characterCountContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'flex-end',
  },
  characterCount: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  privacyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  privacyEmoji: {
    fontSize: 18,
    marginRight: 12,
  },
  privacyText: {
    flex: 1,
  },
  privacyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  privacyDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  submitSection: {
    marginTop: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  submitNote: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 18,
    color: 'black',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'black',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  errorButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DailyCheckInScreen;
