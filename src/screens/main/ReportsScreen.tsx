import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DisclaimerNote from '../../components/DisclaimerNote';
import { supabase } from '../../services/supabase';
import { CheckIn } from '../../types';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import UpgradePrompt from '../../components/UpgradePrompt';

const { width } = Dimensions.get('window');

interface MonthlyReportData {
  month: string;
  averageMood: number;
  averageConnection: number;
  happiestDays: CheckIn[];
  toughestDays: CheckIn[];
  suggestedFocus: string[];
  totalCheckIns: number;
  streakDays: number;
  moodTrend: 'improving' | 'declining' | 'stable';
  connectionTrend: 'improving' | 'declining' | 'stable';
}

const ReportsScreen = ({ navigation }: any) => {
  const [currentMonth, setCurrentMonth] = useState('');
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentCouple, setCurrentCouple] = useState<any>(null);
  const [scoringExpanded, setScoringExpanded] = useState(false);
  const [showSummaryCard, setShowSummaryCard] = useState(false);

  // Feature gate for reports
  const {
    checkAccess,
    showUpgradePrompt,
    handleUpgrade,
    handleClose,
    hasAccess,
    upgradeMessage
  } = useFeatureGate({
    feature: 'Relationship Reports',
    onUpgrade: () => {
      // Navigation will be handled by the hook
    }
  });

  useEffect(() => {
    loadMonthlyReport();
  }, []);

  const loadMonthlyReport = async () => {
    try {
      setIsLoading(true);
      
      // Check if user has access to this feature
      if (!checkAccess()) {
        setIsLoading(false);
        return;
      }
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Error', 'Unable to load user data. Please try again.');
        return;
      }
      
      setCurrentUser(user);

      // Get couple data
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .select('*')
        .or(`partner1_id.eq.${user.id},partner2_id.eq.${user.id}`)
        .single();
      
      if (coupleError) {
        console.error('Error getting couple:', coupleError);
        // Don't show error if user just doesn't have a partner yet
        if (coupleError.message !== 'No rows returned') {
          Alert.alert('Error', 'Unable to load couple data. Please try again.');
        }
        return;
      }
      
      console.log('Couple data found:', couple);
      setCurrentCouple(couple);

      // Get all check-ins for both partners (not restricted to current month)
      console.log('Fetching check-ins for user:', user.id);
      
      // Get user's check-ins
      const { data: userCheckInsRaw, error: userCheckInsError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (userCheckInsError) {
        console.error('Error fetching user check-ins:', userCheckInsError);
        Alert.alert('Error', 'Unable to load check-in data. Please try again.');
        return;
      }

      // Map database fields to TypeScript interface
      const userCheckIns = userCheckInsRaw?.map(checkIn => ({
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

      console.log('User check-ins found:', userCheckIns.length);

      // Get partner's shared check-ins
      const partnerId = couple.partner1_id === user.id ? couple.partner2_id : couple.partner1_id;
      const { data: partnerCheckInsRaw, error: partnerCheckInsError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', partnerId)
        .eq('is_shared', true)
        .order('date', { ascending: false });

      // Map database fields to TypeScript interface
      const partnerCheckIns = partnerCheckInsRaw?.map(checkIn => ({
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

      if (partnerCheckInsError) {
        console.error('Error fetching partner check-ins:', partnerCheckInsError);
      }

      console.log('Partner check-ins found:', partnerCheckIns.length);

      if (partnerCheckInsError) {
        console.error('Error fetching partner check-ins:', partnerCheckInsError);
      }

      // Combine all check-ins for analysis
      const allCheckIns = [...(userCheckIns || []), ...(partnerCheckIns || [])];
      
      console.log('Total check-ins to analyze:', allCheckIns.length);
      console.log('Sample check-in data:', allCheckIns[0]);
      
      // Debug: Check actual dates
      if (allCheckIns.length > 0) {
        console.log('Date range of check-ins:');
        allCheckIns.forEach((checkIn, index) => {
          console.log(`Check-in ${index + 1}: Date: ${checkIn.date}, Mood: ${checkIn.moodRating}, Connection: ${checkIn.connectionRating}`);
        });
      }
      
      // Generate monthly report
      const report = generateMonthlyReport(allCheckIns, userCheckIns || []);
      console.log('Generated report:', report);
      setMonthlyReport(report);
      setCurrentMonth(report.month);

    } catch (error) {
      console.error('Load monthly report error:', error);
      Alert.alert('Error', 'Unable to load monthly report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMonthlyReport = (allCheckIns: CheckIn[], userCheckIns: CheckIn[]): MonthlyReportData => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const currentDate = new Date();
    const month = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    
          console.log('Generating report for month:', month);
      console.log('Current date:', currentDate.toISOString());
      console.log('Total check-ins to analyze:', allCheckIns.length);
    
    if (allCheckIns.length === 0) {
      return {
        month,
        averageMood: 0,
        averageConnection: 0,
        happiestDays: [],
        toughestDays: [],
        suggestedFocus: ['Start tracking your daily check-ins', 'Share your feelings with your partner', 'Focus on small moments of connection'],
        totalCheckIns: 0,
        streakDays: 0,
        moodTrend: 'stable',
        connectionTrend: 'stable',
      };
    }

    // Enhanced scoring algorithm with weighted factors and relationship context
    const calculateDayScore = (checkIn: CheckIn) => {
      const moodWeight = 0.35; // Mood contributes 35%
      const connectionWeight = 0.65; // Connection contributes 65% (more important for relationships)
      
      // Base scores
      const moodScore = (checkIn.moodRating || 0) * moodWeight;
      const connectionScore = (checkIn.connectionRating || 0) * connectionWeight;
      
      // Bonus for high connection scores (relationship health indicator)
      let connectionBonus = 0;
      if ((checkIn.connectionRating || 0) >= 8) {
        connectionBonus = 0.5; // Bonus for strong connection days
      }
      
      // Penalty for very low mood (can affect relationship)
      let moodPenalty = 0;
      if ((checkIn.moodRating || 0) <= 3) {
        moodPenalty = -0.3; // Penalty for very low mood
      }
      
      const totalScore = moodScore + connectionScore + connectionBonus + moodPenalty;
      
      // Ensure score stays within reasonable bounds
      return Math.max(0, Math.min(10, totalScore));
    };

    // Calculate weighted averages
    const totalMood = allCheckIns.reduce((sum, checkIn) => sum + (checkIn.moodRating || 0), 0);
    const totalConnection = allCheckIns.reduce((sum, checkIn) => sum + (checkIn.connectionRating || 0), 0);
    const averageMood = totalMood / allCheckIns.length;
    const averageConnection = totalConnection / allCheckIns.length;

    console.log('Reports - Relationship Connection score calculation:', {
      totalConnection,
      count: allCheckIns.length,
      averageConnection,
      roundedScore: Math.round(averageConnection * 10) / 10,
      checkIns: allCheckIns.map(c => ({ date: c.date, connectionRating: c.connectionRating })),
      note: 'This is the relationship average (both partners), not just the user\'s personal score'
    });
    console.log('Calculated averages - Mood:', averageMood, 'Connection:', averageConnection);

    // Find happiest and toughest days using enhanced scoring
    const checkInsWithScores = allCheckIns.map(checkIn => ({
      ...checkIn,
      dayScore: calculateDayScore(checkIn)
    }));

    // Sort by score (highest to lowest)
    const sortedByHappiness = [...checkInsWithScores].sort((a, b) => b.dayScore - a.dayScore);
    const sortedByToughness = [...checkInsWithScores].sort((a, b) => a.dayScore - b.dayScore);

    // Take top 3 happiest and bottom 3 toughest (no overlap)
    const happiestDays = sortedByHappiness.slice(0, 3);
    const toughestDays = sortedByToughness.slice(0, 3);

    // Ensure no overlap between happiest and toughest
    const toughestDaysFiltered = toughestDays.filter(toughDay => 
      !happiestDays.some(happyDay => happyDay.id === toughDay.id)
    );

    console.log('Happiest days scores:', happiestDays.map(d => ({ date: d.date, score: d.dayScore })));
    console.log('Toughest days scores:', toughestDays.map(d => ({ date: d.date, score: d.dayScore })));

    // Calculate streak days
    const streakDays = calculateStreakDays(userCheckIns);

    // Generate intelligent suggested focus areas
    const suggestedFocus = generateIntelligentFocus(averageMood, averageConnection, toughestDays, allCheckIns);

    // Enhanced trend analysis with more sophisticated logic
    const moodTrend = analyzeTrend(averageMood, 'mood');
    const connectionTrend = analyzeTrend(averageConnection, 'connection');

    return {
      month,
      averageMood: Math.round(averageMood * 10) / 10,
      averageConnection: Math.round(averageConnection * 10) / 10,
      happiestDays,
      toughestDays: toughestDaysFiltered,
      suggestedFocus,
      totalCheckIns: allCheckIns.length,
      streakDays,
      moodTrend,
      connectionTrend,
    };
  };

  const calculateStreakDays = (checkIns: CheckIn[]): number => {
    if (checkIns.length === 0) return 0;
    
    const sortedCheckIns = [...checkIns].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) { // Check last 30 days
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasCheckIn = checkIns.some(checkIn => checkIn.date === dateStr);
      
      if (hasCheckIn) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const generateIntelligentFocus = (avgMood: number, avgConnection: number, toughestDays: CheckIn[], allCheckIns: CheckIn[]): string[] => {
    const suggestions: string[] = [];
    
    // Analyze specific patterns from actual data
    const lowMoodDays = allCheckIns.filter(day => (day.moodRating || 0) < 5);
    const lowConnectionDays = allCheckIns.filter(day => (day.connectionRating || 0) < 5);
    const highMoodDays = allCheckIns.filter(day => (day.moodRating || 0) >= 8);
    const highConnectionDays = allCheckIns.filter(day => (day.connectionRating || 0) >= 8);
    
    // Pattern 1: Mood vs Connection imbalance
    if (avgMood > avgConnection + 1.5) {
      suggestions.push(`Your mood (${avgMood.toFixed(1)}) is significantly higher than your connection (${avgConnection.toFixed(1)}). Try: "Ask your partner 'How can I better support you today?' before sharing your own feelings"`);
    } else if (avgConnection > avgMood + 1.5) {
      suggestions.push(`Your connection (${avgConnection.toFixed(1)}) is stronger than your mood (${avgMood.toFixed(1)}). Try: "Schedule 15 minutes of self-care before your next check-in to boost your emotional state"`);
    }
    
    // Pattern 2: Specific low connection days analysis
    if (lowConnectionDays.length > 0) {
      const recentLowConnection = lowConnectionDays.slice(0, 2);
      const commonThemes = recentLowConnection.map(day => day.reflection?.toLowerCase() || '');
      
      if (commonThemes.some(theme => theme.includes('work') || theme.includes('stress'))) {
        suggestions.push(`Work stress is affecting your connection. Try: "Set a 5-minute 'relationship reset' ritual after work - share one positive thing about your day"`);
      } else if (commonThemes.some(theme => theme.includes('tired') || theme.includes('sleep'))) {
        suggestions.push(`Fatigue is impacting your connection. Try: "Move your check-in to morning coffee time when you're both more alert and present"`);
      } else {
        suggestions.push(`Your lowest connection days (${lowConnectionDays.length} this month) need attention. Try: "Schedule a 'relationship check-in' date night this week to reconnect"`);
      }
    }
    
    // Pattern 3: Consistency analysis with specific actions
    const moodVariance = calculateVariance(allCheckIns.map(c => c.moodRating || 0));
    const connectionVariance = calculateVariance(allCheckIns.map(c => c.connectionRating || 0));
    
    if (moodVariance > 2.5) {
      const moodRange = Math.max(...allCheckIns.map(c => c.moodRating || 0)) - Math.min(...allCheckIns.map(c => c.moodRating || 0));
      suggestions.push(`Your mood varies significantly (range: ${moodRange} points). Try: "Create a daily mood anchor - write 3 things you're grateful for before your check-in"`);
    }
    
    if (connectionVariance > 2.5) {
      suggestions.push(`Your connection quality varies a lot. Try: "Identify your 'connection triggers' - what activities consistently bring you closer? Do more of those"`);
    }
    
    // Pattern 4: Learn from high-performing days
    if (highConnectionDays.length > 0 && lowConnectionDays.length > 0) {
      const highDay = highConnectionDays[0];
      const lowDay = lowConnectionDays[0];
      
      if (highDay.reflection && lowDay.reflection) {
        suggestions.push(`Your best connection day mentioned "${highDay.reflection.substring(0, 30)}..." vs worst day "${lowDay.reflection.substring(0, 30)}...". Try: "Recreate the positive elements from your best day"`);
      }
    }
    
    // Pattern 5: Streak-based suggestions
    const currentStreak = calculateStreakDays(allCheckIns);
    if (currentStreak === 0) {
      suggestions.push(`You haven't checked in consistently. Try: "Set a daily reminder at 8 PM and make it a 2-minute ritual you both look forward to"`);
    } else if (currentStreak >= 7) {
      suggestions.push(`Great consistency! You're on a ${currentStreak}-day streak. Try: "Level up - add a weekly 'relationship goals' conversation to your routine"`);
    }
    
    // Pattern 6: Time-based patterns
    const checkInTimes = allCheckIns.map(c => new Date(c.createdAt).getHours());
    const morningCheckIns = checkInTimes.filter(hour => hour < 12).length;
    const eveningCheckIns = checkInTimes.filter(hour => hour >= 18).length;
    
    if (morningCheckIns > eveningCheckIns) {
      suggestions.push(`You check in more in the morning. Try: "Use your morning energy to set a relationship intention for the day"`);
    } else if (eveningCheckIns > morningCheckIns) {
      suggestions.push(`You check in more in the evening. Try: "Reflect on your day together and plan tomorrow's connection moment"`);
    }
    
    // Ensure we have actionable suggestions
    if (suggestions.length === 0) {
      suggestions.push(`Your relationship is stable! Try: "Experiment with one new connection activity this week - cooking together, walking, or trying a new hobby"`);
    }
    
    // Return top 3 most actionable suggestions
    return suggestions.slice(0, 3).map(suggestion => {
      // Ensure each suggestion starts with an action
      if (!suggestion.includes('Try:')) {
        return `Try: ${suggestion}`;
      }
      return suggestion;
    });
  };

  const calculateVariance = (values: number[]): number => {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length);
  };

  const analyzeTrend = (score: number, type: 'mood' | 'connection'): 'improving' | 'declining' | 'stable' => {
    // More sophisticated trend analysis
    if (type === 'mood') {
      if (score >= 8.5) return 'improving';
      if (score <= 3.5) return 'declining';
      if (score >= 6.5) return 'stable';
      return 'declining';
    } else { // connection
      if (score >= 8.5) return 'improving';
      if (score <= 3.5) return 'declining';
      if (score >= 6.5) return 'stable';
      return 'declining';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#10B981'; // Green
    if (score >= 6) return '#F59E0B'; // Yellow
    if (score >= 4) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  const getScoreText = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Needs Attention';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'improving': return 'Improving';
      case 'declining': return 'Declining';
      default: return 'Stable';
    }
  };

  const generateSummaryCard = () => {
    if (!monthlyReport) return '';

    const summaryText = `💕 HeartCheck Relationship Summary - ${currentMonth}

📊 Overall Health:
• Mood: ${monthlyReport.averageMood.toFixed(1)}/10 (${getScoreText(monthlyReport.averageMood)})
• Connection: ${monthlyReport.averageConnection.toFixed(1)}/10 (${getScoreText(monthlyReport.averageConnection)})

📈 Stats:
• Total Check-ins: ${monthlyReport.totalCheckIns}
• Current Streak: ${monthlyReport.streakDays} days

${monthlyReport.happiestDays.length > 0 ? `🌟 Best Days:
${monthlyReport.happiestDays.slice(0, 2).map((day, index) => 
  `• ${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${(day as any).dayScore?.toFixed(1) || 'N/A'}/10 - "${day.reflection.substring(0, 50)}..."`
).join('\n')}

` : ''}${monthlyReport.suggestedFocus.length > 0 ? `💡 Focus Areas:
${monthlyReport.suggestedFocus.map((focus, index) => `${index + 1}. ${focus}`).join('\n')}

` : ''}Keep nurturing your relationship! 💕

Generated by HeartCheck App`;

    return summaryText;
  };

  const handleGenerateSummaryCard = async () => {
    try {
      const summaryText = generateSummaryCard();
      
      // Show the summary card in a modal first
      setShowSummaryCard(true);
      
      // Also prepare for sharing
      setTimeout(() => {
        Share.share({
          message: summaryText || 'No summary available',
          title: `HeartCheck Summary - ${currentMonth}`,
        }).catch((error) => {
          console.error('Error sharing:', error);
          Alert.alert('Error', 'Unable to share summary card. Please try again.');
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error generating summary card:', error);
      Alert.alert('Error', 'Unable to generate summary card. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Generating your monthly report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!monthlyReport) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load monthly report</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadMonthlyReport}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Check if user has no check-ins
  if (monthlyReport.totalCheckIns === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Relationship Health</Text>
            <Text style={styles.subtitle}>{currentMonth}</Text>
          </View>
          
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateEmoji}>📊</Text>
            <Text style={styles.emptyStateTitle}>No Data Yet</Text>
            <Text style={styles.emptyStateDescription}>
              Start tracking your daily check-ins to see your relationship health insights and trends.
            </Text>
            
            <TouchableOpacity 
              style={styles.startTrackingButton}
              onPress={() => navigation.navigate('CheckIn')}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.startTrackingButtonGradient}
              >
                <Text style={styles.startTrackingButtonText}>Start Tracking</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Relationship Health</Text>
          <Text style={styles.subtitle}>{currentMonth}</Text>
          <Text style={styles.headerNote}>Based on both partners' check-ins</Text>
        </View>

        {/* Scoring Explanation - Collapsible */}
        <View style={styles.scoringInfo}>
          <TouchableOpacity 
            style={styles.scoringHeader}
            onPress={() => setScoringExpanded(!scoringExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.scoringHeaderLeft}>
              <Text style={styles.scoringIcon}>📊</Text>
              <Text style={styles.scoringTitle}>Scoring System</Text>
            </View>
            <Text style={styles.scoringExpandIcon}>
              {scoringExpanded ? '−' : '+'}
            </Text>
          </TouchableOpacity>
          
          {scoringExpanded && (
            <>
              <View style={styles.scoringGrid}>
                <View style={styles.scoringItem}>
                  <View style={styles.scoringItemHeader}>
                    <Text style={styles.scoringItemIcon}>❤️</Text>
                    <Text style={styles.scoringItemLabel}>Connection</Text>
                    <Text style={styles.scoringItemWeight}>65%</Text>
                  </View>
                  <Text style={styles.scoringItemDesc}>How connected you felt with your partner</Text>
                </View>
                
                <View style={styles.scoringItem}>
                  <View style={styles.scoringItemHeader}>
                    <Text style={styles.scoringItemIcon}>😊</Text>
                    <Text style={styles.scoringItemLabel}>Mood</Text>
                    <Text style={styles.scoringItemWeight}>35%</Text>
                  </View>
                  <Text style={styles.scoringItemDesc}>Your overall emotional state</Text>
                </View>
              </View>
              
              <View style={styles.scoringBonuses}>
                <View style={styles.bonusItem}>
                  <Text style={styles.bonusIcon}>✨</Text>
                  <Text style={styles.bonusText}>+0.5 bonus for strong connections (8+)</Text>
                </View>
                <View style={styles.bonusItem}>
                  <Text style={styles.bonusIcon}>⚠️</Text>
                  <Text style={styles.bonusText}>-0.3 penalty for very low mood (≤3)</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Mood</Text>
            <Text style={[styles.summaryValue, { color: getScoreColor(monthlyReport.averageMood) }]}>
              {monthlyReport.averageMood.toFixed(1)}
            </Text>
            <Text style={styles.summaryText}>{getScoreText(monthlyReport.averageMood)}</Text>
            <View style={styles.trendContainer}>
              <Text style={styles.trendIcon}>{getTrendIcon(monthlyReport.moodTrend)}</Text>
              <Text style={styles.trendText}>{getTrendText(monthlyReport.moodTrend)}</Text>
            </View>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Connection</Text>
            <Text style={[styles.summaryValue, { color: getScoreColor(monthlyReport.averageConnection) }]}>
              {monthlyReport.averageConnection.toFixed(1)}
            </Text>
            <Text style={styles.summaryText}>{getScoreText(monthlyReport.averageConnection)}</Text>
            <View style={styles.trendContainer}>
              <Text style={styles.trendIcon}>{getTrendIcon(monthlyReport.connectionTrend)}</Text>
              <Text style={styles.trendText}>{getTrendText(monthlyReport.connectionTrend)}</Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <DisclaimerNote style={{ marginHorizontal: 20, marginBottom: 20 }} />

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{monthlyReport.totalCheckIns}</Text>
            <Text style={styles.statLabel}>Check-ins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{monthlyReport.streakDays}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        {/* Happiest Days */}
        {monthlyReport.happiestDays.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌟 Top Relationship Days</Text>
            <Text style={styles.sectionSubtitle}>Your best moments together this month</Text>
            {monthlyReport.happiestDays.map((day, index) => (
              <View key={day.id || index} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayHeaderLeft}>
                    <Text style={styles.dayDate}>
                      {new Date(day.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                    <Text style={styles.dayScore}>Score: {(day as any).dayScore?.toFixed(1) || 'N/A'}/10</Text>
                  </View>
                  <View style={styles.dayRatings}>
                    <Text style={styles.dayRating}>😊 {day.moodRating}/10</Text>
                    <Text style={styles.dayRating}>❤️ {day.connectionRating}/10</Text>
                  </View>
                </View>
                <Text style={styles.dayReflection}>{day.reflection}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Toughest Days */}
        {monthlyReport.toughestDays.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Challenging Days</Text>
            <Text style={styles.sectionSubtitle}>Days that need attention and care</Text>
            {monthlyReport.toughestDays.map((day, index) => (
              <View key={day.id || index} style={[styles.dayCard, styles.toughDayCard]}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayHeaderLeft}>
                    <Text style={styles.dayDate}>
                      {new Date(day.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                    <Text style={styles.dayScore}>Score: {(day as any).dayScore?.toFixed(1) || 'N/A'}/10</Text>
                  </View>
                  <View style={styles.dayRatings}>
                    <Text style={styles.dayRating}>😔 {day.moodRating}/10</Text>
                    <Text style={styles.dayRating}>💔 {day.connectionRating}/10</Text>
                  </View>
                </View>
                <Text style={styles.dayReflection}>{day.reflection}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Suggested Focus Areas */}
        {monthlyReport.suggestedFocus.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggested Focus Areas</Text>
            {monthlyReport.suggestedFocus.map((focus, index) => (
              <View key={index} style={styles.focusCard}>
                <Text style={styles.focusIcon}>💡</Text>
                <Text style={styles.focusText}>{focus}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Export Button */}
        <TouchableOpacity 
          style={styles.exportButton} 
          activeOpacity={0.8}
          onPress={handleGenerateSummaryCard}
        >
          <Text style={styles.exportButtonText}>Generate Summary Card</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Summary Card Modal */}
      <Modal
        visible={showSummaryCard}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSummaryCard(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.summaryCardModal}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>💕 Your Relationship Summary</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowSummaryCard(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.summaryCardContent} showsVerticalScrollIndicator={false}>
              {monthlyReport ? (
                <View style={styles.summaryCardBody}>
                  {/* Header */}
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryTitle}>💕 HeartCheck Relationship Summary</Text>
                    <Text style={styles.summarySubtitle}>{currentMonth}</Text>
                  </View>

                  {/* Overall Health Section */}
                  <View style={styles.summarySection}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionIcon}>📊</Text>
                      <Text style={styles.sectionTitle}>Overall Health</Text>
                    </View>
                    <View style={styles.healthMetrics}>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Mood</Text>
                        <View style={styles.metricValue}>
                          <Text style={[styles.metricScore, { color: getScoreColor(monthlyReport.averageMood) }]}>
                            {monthlyReport.averageMood.toFixed(1)}/10
                          </Text>
                          <Text style={styles.metricRating}>({getScoreText(monthlyReport.averageMood)})</Text>
                        </View>
                      </View>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Connection</Text>
                        <View style={styles.metricValue}>
                          <Text style={[styles.metricScore, { color: getScoreColor(monthlyReport.averageConnection) }]}>
                            {monthlyReport.averageConnection.toFixed(1)}/10
                          </Text>
                          <Text style={styles.metricRating}>({getScoreText(monthlyReport.averageConnection)})</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Stats Section */}
                  <View style={styles.summarySection}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionIcon}>📈</Text>
                      <Text style={styles.sectionTitle}>Stats</Text>
                    </View>
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{monthlyReport.totalCheckIns}</Text>
                        <Text style={styles.statLabel}>Check-ins</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{monthlyReport.streakDays}</Text>
                        <Text style={styles.statLabel}>Day Streak</Text>
                      </View>
                    </View>
                  </View>

                  {/* Best Days Section */}
                  {monthlyReport.happiestDays.length > 0 && (
                    <View style={styles.summarySection}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>🌟</Text>
                        <Text style={styles.sectionTitle}>Best Days</Text>
                      </View>
                      {monthlyReport.happiestDays.slice(0, 2).map((day, index) => (
                        <View key={day.id || index} style={styles.daySummaryCard}>
                          <View style={styles.daySummaryHeader}>
                            <Text style={styles.daySummaryDate}>
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                            <Text style={styles.daySummaryScore}>
                              {(day as any).dayScore?.toFixed(1) || 'N/A'}/10
                            </Text>
                          </View>
                          <Text style={styles.daySummaryReflection}>
                            "{day.reflection.substring(0, 60)}..."
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Focus Areas Section */}
                  {monthlyReport.suggestedFocus.length > 0 && (
                    <View style={styles.summarySection}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>💡</Text>
                        <Text style={styles.sectionTitle}>Focus Areas</Text>
                      </View>
                      {monthlyReport.suggestedFocus.map((focus, index) => (
                        <View key={index} style={styles.focusSummaryItem}>
                          <Text style={styles.focusSummaryNumber}>{index + 1}</Text>
                          <Text style={styles.focusSummaryText}>{focus}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Footer */}
                  <View style={styles.summaryFooter}>
                    <Text style={styles.summaryFooterText}>Keep nurturing your relationship! 💕</Text>
                    <Text style={styles.summaryFooterApp}>Generated by HeartCheck App</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noDataText}>No data available</Text>
              )}
            </ScrollView>
            
            <View style={styles.summaryCardActions}>
              <TouchableOpacity 
                style={styles.shareButton}
                onPress={() => {
                  const summaryText = generateSummaryCard();
                  Share.share({
                    message: summaryText || 'No summary available',
                    title: `HeartCheck Summary - ${currentMonth}`,
                  });
                }}
              >
                <Text style={styles.shareButtonText}>📤 Share Summary</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.closeModalButton}
                onPress={() => setShowSummaryCard(false)}
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={handleClose}
        onUpgrade={handleUpgrade}
        title="Relationship Reports Require Premium"
        message={upgradeMessage}
        feature="Relationship Reports"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Light background
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444', // Red error color
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#10B981', // Green button
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  headerNote: {
    fontSize: 14,
    fontWeight: '400',
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  scoringInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 60,
  },
  scoringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
    paddingVertical: 8,
  },
  scoringHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoringExpandIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6B7280',
    width: 24,
    textAlign: 'center',
  },
  scoringIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  scoringTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  scoringGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  scoringItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scoringItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoringItemIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  scoringItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  scoringItemWeight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoringItemDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  scoringBonuses: {
    gap: 8,
  },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
  },
  bonusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  bonusText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },

  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 15,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFF', // White card
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  trendIcon: {
    fontSize: 18,
    marginRight: 5,
  },
  trendText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 15,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#FFF', // White stat item
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  dayCard: {
    backgroundColor: '#FFF', // White day card
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toughDayCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444', // Red border for toughest days
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayHeaderLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  dayScore: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  dayDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  dayRatings: {
    flexDirection: 'row',
    gap: 10,
  },
  dayRating: {
    fontSize: 14,
    color: '#666',
  },
  dayReflection: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  focusCard: {
    backgroundColor: '#FFF', // White focus card
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  focusIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  focusText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  exportButton: {
    backgroundColor: '#10B981', // Green button
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exportButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 15,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  startTrackingButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
  },
  startTrackingButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  startTrackingButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Summary Card Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  summaryCardModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 15,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryCardContent: {
    maxHeight: 450,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  summaryCardBody: {
    paddingBottom: 16,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  healthMetrics: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  metricValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricScore: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  metricRating: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  daySummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  daySummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  daySummaryDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  daySummaryScore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  daySummaryReflection: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  focusSummaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 8,
  },
  focusSummaryNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
    marginTop: 2,
  },
  focusSummaryText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  summaryFooter: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
  },
  summaryFooterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  summaryFooterApp: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 40,
  },
  summaryCardActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeModalButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeModalButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReportsScreen;
