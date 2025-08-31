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
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const { user, error: authError } = await auth.getCurrentUser();
        
        if (user) {
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
          
          // Fetch recent check-ins
          const { data: checkIns, error: checkInsError } = await supabase
            .from('check_ins')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(3);
          
          if (checkIns) {
            setRecentCheckIns(checkIns);
            // Calculate average connection score
            const totalScore = checkIns.reduce((sum, checkIn) => sum + (checkIn.connection_rating || 0), 0);
            const avgScore = checkIns.length > 0 ? totalScore / checkIns.length : 0;
            setConnectionScore(Math.round(avgScore * 10) / 10); // Round to 1 decimal
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setUserName('there');
        setHasPartner(false);
        setConnectionScore(0);
        setRecentCheckIns([]);
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
            {/* Connection Score Card */}
            <View style={styles.scoreCard}>
              <LinearGradient
                colors={['#8BC34A', '#689F38']}
                style={styles.scoreGradient}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '500', marginBottom: 16, textAlign: 'center' }}>
                  Connection Score
                </Text>
                <Text style={{ color: 'white', fontSize: 48, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
                  {connectionScore || '--'}
                </Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                  <Text style={{ color: 'white', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                    {connectionScore >= 8 ? 'Excellent' : connectionScore >= 6 ? 'Good' : connectionScore >= 4 ? 'Fair' : 'Start Today'}
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Today's Check-In Card */}
            <TouchableOpacity
              style={styles.checkInCard}
              onPress={() => navigation.navigate('CheckIn')}
              activeOpacity={0.9}
            >
              <View style={styles.checkInContent}>
                <View style={styles.checkInLeft}>
                  <View style={styles.checkInIconContainer}>
                    <Text style={{ fontSize: 20, color: '#8BC34A' }}>💝</Text>
                  </View>
                  <View style={styles.checkInTextContainer}>
                    <Text style={{ color: 'black', fontSize: 18, fontWeight: '600', marginBottom: 4 }}>
                      Daily Check-In
                    </Text>
                    <Text style={{ color: '#6B7280', fontSize: 14, lineHeight: 18 }}>
                      How's your connection today?
                    </Text>
                  </View>
                </View>
                <View style={styles.checkInAction}>
                                      <Text style={{ fontSize: 16, color: '#8BC34A', fontWeight: '600' }}>Start</Text>
                    <Text style={{ fontSize: 16, color: '#8BC34A' }}>→</Text>
                </View>
              </View>
            </TouchableOpacity>

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
                    {new Date(checkIn.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <Text style={{ color: '#8BC34A', fontSize: 18, fontWeight: '600' }}>
                    {checkIn.connection_rating || '--'}
                  </Text>
                </View>
                <Text style={{ color: 'black', fontSize: 16, lineHeight: 22 }}>
                  {checkIn.reflection || 'No reflection added'}
                </Text>
                <View style={styles.checkInMeta}>
                  <Text style={{ color: '#6B7280', fontSize: 12 }}>
                    Mood: {checkIn.mood_rating || '--'}/10
                  </Text>
                  <Text style={{ color: '#6B7280', fontSize: 12 }}>
                    {checkIn.is_shared ? 'Shared with partner' : 'Private'}
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
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreIconContainer: {
    marginRight: 12,
  },
  scoreIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreIconText: {
    fontSize: 16,
    color: 'white',
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    opacity: 0.9,
  },
  scoreBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    marginTop: 12,
  },
  scoreBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },

  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  scoreStatus: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    opacity: 0.9,
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
});

export default DashboardScreen;
