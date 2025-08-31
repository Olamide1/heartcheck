import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Layout } from '../../constants';
import { auth, supabase } from '../../services/supabase';
import { patternAlertsService } from '../../services/patternAlerts';
import { guidedExercisesService } from '../../services/guidedExercises';

const DashboardScreen = ({ navigation }: any) => {

  
  // Get current time for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };
  
  const [userName, setUserName] = useState<string>('');
  const [hasPartner, setHasPartner] = useState<boolean>(false);
  const [partnerName, setPartnerName] = useState<string>('');
  const [connectionScore, setConnectionScore] = useState<number>(0);
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [partnerCheckIns, setPartnerCheckIns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [exerciseRecommendations, setExerciseRecommendations] = useState<any[]>([]);
  const [coupleId, setCoupleId] = useState<string>('');
  
  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const { user, error: authError } = await auth.getCurrentUser();
        
        if (user) {
          setCurrentUser(user);
          // Fetch user profile
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();
          
          if (profile?.name) {
            setUserName(profile.name);
          } else {
            setUserName('there');
          }
          
          // Check if user has a partner
          const { data: couple, error: coupleError } = await supabase
            .from('couples')
            .select('*')
            .or(`partner1_id.eq.${user.id},partner2_id.eq.${user.id}`)
            .single();
          
          setHasPartner(!!couple);
          if (couple) {
            setCoupleId(couple.id);
          }
          
          // If user has a partner, get partner's name
          if (couple) {
            const partnerId = couple.partner1_id === user.id ? couple.partner2_id : couple.partner1_id;
            const { data: partnerProfile } = await supabase
              .from('users')
              .select('name')
              .eq('id', partnerId)
              .single();
            
            if (partnerProfile?.name) {
              setPartnerName(partnerProfile.name);
            }
          } else {
            setPartnerName('');
          }
          
          // Fetch user's own check-ins
          const { data: ownCheckInsRaw, error: ownCheckInsError } = await supabase
            .from('check_ins')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(3);
          
          // Fetch partner's shared check-ins if user has a partner
          let partnerCheckIns: any[] = [];
          if (couple) {
            const partnerId = couple.partner1_id === user.id ? couple.partner2_id : couple.partner1_id;
            const { data: sharedCheckInsRaw, error: sharedCheckInsError } = await supabase
              .from('check_ins')
              .select('*')
              .eq('user_id', partnerId)
              .eq('is_shared', true)
              .order('created_at', { ascending: false })
              .limit(3);
            
            if (sharedCheckInsRaw) {
              // Map partner check-ins to TypeScript interface
              partnerCheckIns = sharedCheckInsRaw.map(checkIn => ({
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
            }
          }
          
          // Map user check-ins to TypeScript interface (same as Reports)
          const ownCheckIns = ownCheckInsRaw?.map(checkIn => ({
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
          })) || [];
          
          // Set user's own check-ins for the main dashboard
          if (ownCheckIns && ownCheckIns.length > 0) {
            setRecentCheckIns(ownCheckIns);
            
            // Calculate average connection score from user's own check-ins (personal score)
            const totalScore = ownCheckIns.reduce((sum, checkIn) => sum + (checkIn.connectionRating || 0), 0);
            const avgScore = totalScore / ownCheckIns.length;
            setConnectionScore(Math.round(avgScore * 10) / 10); // Round to 1 decimal
            
            console.log('Dashboard - Personal Connection score calculation:', {
              totalScore,
              count: ownCheckIns.length,
              avgScore,
              roundedScore: Math.round(avgScore * 10) / 10,
              checkIns: ownCheckIns.map(c => ({ date: c.date, connectionRating: c.connectionRating })),
              note: 'This is the user\'s personal connection score, not the relationship average'
            });
          } else {
            setRecentCheckIns([]);
            setConnectionScore(0);
          }
          
          // Store partner check-ins separately for the partner section
          setPartnerCheckIns(partnerCheckIns);
          
          // Fetch pattern alerts and exercise recommendations if user has a partner
          if (couple) {
            try {
              // Get active pattern alerts
              const alerts = await patternAlertsService.getActiveAlerts(couple.id);
              setActiveAlerts(alerts);
              
              // Get personalized exercise recommendations
              const recommendations = await guidedExercisesService.getPersonalizedRecommendations(user.id, couple.id);
              setExerciseRecommendations(recommendations);
              
              // Check for new patterns after check-ins
              if (ownCheckIns && ownCheckIns.length > 0) {
                const patterns = await patternAlertsService.checkForPatterns(couple.id, user.id);
                if (patterns.length > 0) {
                  // Create alerts for new patterns
                  for (const pattern of patterns) {
                    if (pattern.shouldAlert) {
                      await patternAlertsService.createPatternAlert({
                        coupleId: couple.id,
                        userId: user.id,
                        type: pattern.alertType,
                        title: pattern.title,
                        message: pattern.message,
                        suggestedAction: pattern.suggestedAction,
                        patternData: pattern.patternData,
                        severity: pattern.severity,
                        isRead: false,
                        isDismissed: false,
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
                      });
                    }
                  }
                  
                  // Refresh alerts after creating new ones
                  const updatedAlerts = await patternAlertsService.getActiveAlerts(couple.id);
                  setActiveAlerts(updatedAlerts);
                }
              }
            } catch (error) {
              console.error('Error fetching pattern alerts and recommendations:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setUserName('there');
        setHasPartner(false);
        setConnectionScore(0);
        setRecentCheckIns([]);
        setPartnerCheckIns([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: '#6B7280', fontSize: 16, textAlign: 'center' }}>
            Loading your dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={{ color: 'black', fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
            {getGreeting()}, {userName}
          </Text>
          <Text style={{ color: 'black', fontSize: 16, fontWeight: '500', textAlign: 'center', lineHeight: 22 }}>
            {!hasPartner && recentCheckIns.length === 0 
              ? "Let's start your relationship wellness journey" 
              : "Here's your relationship health snapshot"}
          </Text>
        </View>

        {/* New User Onboarding Flow */}
        {!hasPartner && recentCheckIns.length === 0 && (
          <View style={styles.onboardingSection}>
            <View style={styles.welcomeCard}>
              <Text style={{ color: 'black', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
                Welcome to HeartCheck! 🎉
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 24 }}>
                Let's get you started on your relationship wellness journey
              </Text>
              
              <View style={styles.actionSteps}>
                <View style={styles.stepItem}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepNumber}>
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>1</Text>
                  </View>
                    <View style={styles.stepContent}>
                      <Text style={{ color: 'black', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                        Start Your First Check-In
                      </Text>
                      <Text style={{ color: '#6B7280', fontSize: 14, lineHeight: 20 }}>
                        Track your daily relationship health
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => navigation.navigate('CheckIn')}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                      Start Check-In
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.stepItem}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepNumber}>
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>2</Text>
                  </View>
                    <View style={styles.stepContent}>
                      <Text style={{ color: 'black', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                        Invite Your Partner
                      </Text>
                      <Text style={{ color: '#6B7280', fontSize: 14, lineHeight: 20 }}>
                        Share the journey together
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => navigation.navigate('InvitePartner')}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                      Generate Code
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Active User Dashboard */}
        {(hasPartner || recentCheckIns.length > 0) && (
          <>
            {/* Compact Connection Score Card */}
            <View style={styles.scoreCard}>
              <LinearGradient
                colors={['#8BC34A', '#689F38']}
                style={styles.scoreGradient}
              >
                <View style={styles.scoreContent}>
                  <View style={styles.scoreLeft}>
                    <Text style={styles.scoreTitle}>Your Connection Score</Text>
                    <Text style={styles.scoreValue}>{connectionScore || '--'}</Text>
                    <Text style={styles.scoreSubtitle}>Based on your check-ins</Text>
                  </View>
                  <View style={styles.scoreRight}>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreBadgeText}>
                        {connectionScore >= 8 ? 'Excellent' : connectionScore >= 6 ? 'Good' : connectionScore >= 4 ? 'Fair' : 'Start Today'}
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Pattern Alerts Section */}
            {activeAlerts.length > 0 && (
              <View style={styles.alertsSection}>
                <Text style={styles.sectionTitle}>Pattern Alerts</Text>
                {activeAlerts.map((alert, index) => (
                  <View key={alert.id} style={[
                    styles.alertCard,
                    alert.severity === 'high' && styles.highSeverityAlert,
                    alert.severity === 'medium' && styles.mediumSeverityAlert,
                    alert.severity === 'low' && styles.lowSeverityAlert,
                  ]}>
                    <View style={styles.alertHeader}>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      <View style={[
                        styles.severityBadge,
                        alert.severity === 'high' && styles.highSeverityBadge,
                        alert.severity === 'medium' && styles.mediumSeverityBadge,
                        alert.severity === 'low' && styles.lowSeverityBadge,
                      ]}>
                        <Text style={styles.severityText}>{alert.severity}</Text>
                      </View>
                    </View>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    <Text style={styles.alertAction}>{alert.suggestedAction}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Exercise Recommendations Section */}
            {exerciseRecommendations.length > 0 && (
              <View style={styles.recommendationsSection}>
                <Text style={styles.sectionTitle}>Recommended Exercises</Text>
                {exerciseRecommendations.slice(0, 3).map((rec, index) => (
                  <TouchableOpacity
                    key={rec.id}
                    style={styles.recommendationCard}
                    onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: rec.exerciseId })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.recommendationContent}>
                      <View style={styles.recommendationLeft}>
                        <Text style={styles.recommendationTitle}>Exercise #{index + 1}</Text>
                        <Text style={styles.recommendationReason}>{rec.reason}</Text>
                        <Text style={styles.recommendationPriority}>Priority: {rec.priority}</Text>
                      </View>
                      <View style={styles.recommendationAction}>
                        <Text style={styles.recommendationButton}>Start</Text>
                        <Text style={styles.recommendationArrow}>→</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}



            {/* Simple Daily Check-In Card */}
            <TouchableOpacity
              style={styles.checkInCard}
              onPress={() => navigation.navigate('CheckIn')}
              activeOpacity={0.9}
            >
              <View style={styles.checkInContent}>
                <View style={styles.checkInLeft}>
                  <View style={styles.checkInIconContainer}>
                    <Text style={{ fontSize: 24, color: '#8BC34A' }}>💝</Text>
                  </View>
                  <View style={styles.checkInTextContainer}>
                    <Text style={{ color: 'black', fontSize: 20, fontWeight: '600', marginBottom: 6 }}>
                      Daily Check-In
                    </Text>
                    <Text style={{ color: '#6B7280', fontSize: 16, lineHeight: 22 }}>
                      How's your connection today?
                    </Text>
                  </View>
                </View>
                <View style={styles.checkInAction}>
                  <Text style={{ fontSize: 18, color: '#8BC34A', fontWeight: '600' }}>Start</Text>
                  <Text style={{ fontSize: 18, color: '#8BC34A' }}>→</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Small Insights Card - Simple & Helpful */}
            {hasPartner && activeAlerts.length === 0 && exerciseRecommendations.length === 0 && (
              <View style={styles.insightsCard}>
                <View style={styles.insightsContent}>
                  <View style={styles.insightsLeft}>
                    <Text style={styles.insightsEmoji}>🔍</Text>
                    <View style={styles.insightsText}>
                      <Text style={styles.insightsTitle}>Unlock Your Insights</Text>
                      <Text style={styles.insightsSubtitle}>
                        Keep checking in daily to see patterns and get personalized recommendations
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.insightsButton}
                    onPress={() => navigation.navigate('CheckIn')}
                  >
                    <Text style={styles.insightsButtonText}>Check In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Partner Status Card */}
            {!hasPartner ? (
              <View style={styles.partnerCard}>
                <View style={styles.partnerHeader}>
                  <Text style={{ color: 'black', fontSize: 20, fontWeight: '600', marginBottom: 16 }}>
                    Ready to invite your partner?
                  </Text>
                </View>
                
                <View style={styles.partnerContent}>
                  <Text style={{ color: 'black', fontSize: 16, marginBottom: 16, textAlign: 'center' }}>
                    Invite them to start tracking together
                  </Text>
                  <TouchableOpacity
                    style={styles.inviteButton}
                    onPress={() => navigation.navigate('InvitePartner')}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['#8BC34A', '#689F38']}
                      style={styles.inviteButtonGradient}
                    >
                      <Text style={styles.inviteButtonText}>Invite Your Partner</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.partnerConnectedCard}>
                <View style={styles.partnerConnectedHeader}>
                  <Text style={{ color: 'black', fontSize: 20, fontWeight: '600', marginBottom: 8 }}>
                    Partner connected! ❤️
                  </Text>
                  <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center' }}>
                    {partnerName ? `You're now tracking your relationship with ${partnerName}` : "You're now tracking your relationship together"}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Partner's Shared Check-ins - Show when user has partner */}
            {hasPartner && partnerCheckIns.length > 0 && (
              <View style={{ backgroundColor: '#F0F9FF', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E40AF', marginBottom: 12, textAlign: 'center' }}>
                  {partnerName ? `${partnerName}'s Recent Check-ins` : "Partner's Recent Check-ins"}
                </Text>
                {partnerCheckIns
                  .slice(0, 2)
                  .map((checkIn, index) => (
                    <View key={checkIn.id || index} style={{ backgroundColor: 'white', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#DBEAFE' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: '#6B7280' }}>
                          {new Date(checkIn.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <Text style={{ fontSize: 12, fontWeight: '500', color: '#059669' }}>
                            😊 {checkIn.moodRating}/10
                          </Text>
                          <Text style={{ fontSize: 12, fontWeight: '500', color: '#059669' }}>
                            💕 {checkIn.connectionRating}/10
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                        {checkIn.reflection}
                      </Text>
                    </View>
                  ))}
              </View>
            )}
          </>
        )}

        {/* Recent Check-Ins Section - Only show when there's data */}
        {recentCheckIns.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={{ color: 'black', fontSize: 20, fontWeight: '600' }}>
                Recent Check-Ins
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
                <Text style={{ color: '#8BC34A', fontSize: 14, fontWeight: '500' }}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
            
            {recentCheckIns.slice(0, 3).map((checkIn, index) => (
              <TouchableOpacity 
                key={checkIn.id || index} 
                style={styles.checkInItem}
                onPress={() => navigation.navigate('CheckIn', { editMode: true, checkInId: checkIn.id })}
                activeOpacity={0.7}
              >
                <View style={styles.checkInDate}>
                  <Text style={{ color: 'black', fontSize: 16, fontWeight: '500' }}>
                    {new Date(checkIn.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <Text style={{ color: '#8BC34A', fontSize: 18, fontWeight: '600' }}>
                    {checkIn.connectionRating || '--'}
                  </Text>
                </View>
                <Text style={{ color: 'black', fontSize: 16, lineHeight: 22 }}>
                  {checkIn.reflection || 'No reflection added'}
                </Text>
                <View style={styles.checkInMeta}>
                  <Text style={{ color: '#6B7280', fontSize: 12 }}>
                    Mood: {checkIn.moodRating || '--'}/10
                  </Text>
                  <Text style={{ color: '#6B7280', fontSize: 12 }}>
                    {checkIn.isShared ? 'Shared with partner' : 'Private'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Reports')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionEmoji}>📊</Text>
            <Text style={styles.actionText}>View Reports</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionEmoji}>👤</Text>
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.paddingHorizontal,
  },
  scrollContent: {
    paddingHorizontal: Layout.paddingHorizontal,
    paddingVertical: Layout.paddingVertical,
  },
  headerSection: {
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.tight * Typography.fontSize['2xl'],
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  scoreCard: {
    marginBottom: Spacing.xl,
    borderRadius: Layout.borderRadius.xl,
    overflow: 'hidden',
    ...Layout.shadow.lg,
  },
  scoreGradient: {
    padding: Layout.padding,
    alignItems: 'center',
  },
  checkInCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.padding,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Layout.shadow.md,
  },
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkInLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkInAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkInIconContainer: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 195, 74, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8BC34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInIconText: {
    fontSize: 18,
    color: 'white',
  },
  checkInTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  checkInTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'black',
    marginBottom: 8,
  },
  checkInSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },

  checkInArrow: {
    alignSelf: 'flex-end',
  },
  arrowText: {
    fontSize: 20,
    color: '#8BC34A',
    fontWeight: 'bold',
  },
  recentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'black',
    marginBottom: 16,
  },
  checkInItem: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.padding,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Layout.shadow.sm,
  },
  checkInDate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8BC34A',
  },
  checkInNote: {
    fontSize: 16,
    color: 'black',
    lineHeight: 22,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.padding,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  emptyStateButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 195, 74, 0.1)',
  },
  checkInMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  onboardingSection: {
    marginBottom: 24,
  },
  welcomeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Layout.shadow.md,
  },
  actionSteps: {
    gap: Spacing.xl,
  },
  stepItem: {
    flexDirection: 'column',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primarySage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
    minWidth: 0,
  },
  stepButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.primarySage,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    ...Layout.shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.padding,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: Spacing.sm,
    ...Layout.shadow.sm,
  },
  actionEmoji: {
    fontSize: 24,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: 500,
    color: 'black',
  },
  partnerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.padding,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Layout.shadow.md,
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  partnerEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  partnerTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: 'black',
  },
  partnerContent: {
    alignItems: 'center',
  },
  partnerStatus: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  partnerInfo: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  partnerConnectedCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  partnerConnectedHeader: {
    alignItems: 'center',
  },
  partnerIconContainer: {
    marginRight: 12,
  },
  partnerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8BC34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerIconText: {
    fontSize: 16,
    color: 'white',
  },
  partnerConnected: {
    alignItems: 'center',
  },
  connectedBadge: {
    backgroundColor: '#8BC34A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    marginBottom: 16,
  },
  connectedBadgeText: {
    fontSize: 14,
    fontWeight: 600,
    color: 'white',
  },
  inviteButton: {
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
  },
  inviteButtonGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semiBold,
  },

  // Pattern Alerts Styles
  alertsSection: {
    marginBottom: 24,
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  highSeverityAlert: {
    borderLeftColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  mediumSeverityAlert: {
    borderLeftColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  lowSeverityAlert: {
    borderLeftColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  highSeverityBadge: {
    backgroundColor: '#fee2e2',
  },
  mediumSeverityBadge: {
    backgroundColor: '#fef3c7',
  },
  lowSeverityBadge: {
    backgroundColor: '#d1fae5',
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  highSeverityText: {
    color: '#dc2626',
  },
  mediumSeverityText: {
    color: '#d97706',
  },
  lowSeverityText: {
    color: '#059669',
  },
  alertMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  alertAction: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    fontStyle: 'italic',
  },

  // Exercise Recommendations Styles
  recommendationsSection: {
    marginBottom: 24,
  },
  recommendationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recommendationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendationLeft: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
    marginBottom: 4,
  },
  recommendationReason: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  recommendationPriority: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  recommendationAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8BC34A',
    marginRight: 8,
  },
  recommendationArrow: {
    fontSize: 16,
    color: '#8BC34A',
  },






  // Compact Score Card Styles
  scoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLeft: {
    flex: 1,
  },
  scoreTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  scoreValue: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scoreSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  scoreRight: {
    alignItems: 'center',
  },
  scoreBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scoreBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Insights Card Styles
  insightsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  insightsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  insightsEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  insightsText: {
    flex: 1,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
    marginBottom: 4,
  },
  insightsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  insightsButton: {
    backgroundColor: '#8BC34A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 16,
  },
  insightsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

});

export default DashboardScreen;
