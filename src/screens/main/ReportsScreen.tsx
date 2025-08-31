import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Colors, Typography, Spacing, Layout } from '../../constants';
import { auth } from '../../services/supabase';
import { MonthlyReport } from '../../types';

const { width } = Dimensions.get('window');

const ReportsScreen = ({ navigation }: any) => {
  const [currentMonth, setCurrentMonth] = useState('');
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMonthlyReport();
  }, []);

  const loadMonthlyReport = async () => {
    try {
      // TODO: Load actual monthly report from database
      // For now, using mock data
      const mockReport: MonthlyReport = {
        month: 'December 2024',
        averageMood: 7.8,
        averageConnection: 8.2,
        happiestDays: [
          {
            id: '1',
            userId: 'user1',
            coupleId: 'couple1',
            date: '2024-12-15',
            moodRating: 9,
            connectionRating: 10,
            reflection: 'Amazing date night, felt so connected',
            isShared: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '2',
            userId: 'user1',
            coupleId: 'couple1',
            date: '2024-12-22',
            moodRating: 9,
            connectionRating: 9,
            reflection: 'Great conversation about future plans',
            isShared: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '3',
            userId: 'user1',
            coupleId: 'couple1',
            date: '2024-12-28',
            moodRating: 8,
            connectionRating: 9,
            reflection: 'Cozy movie night together',
            isShared: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        toughestDays: [
          {
            id: '4',
            userId: 'user1',
            coupleId: 'couple1',
            date: '2024-12-10',
            moodRating: 4,
            connectionRating: 3,
            reflection: 'Work stress affecting our communication',
            isShared: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '5',
            userId: 'user1',
            coupleId: 'couple1',
            date: '2024-12-18',
            moodRating: 5,
            connectionRating: 4,
            reflection: 'Misunderstanding about holiday plans',
            isShared: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '6',
            userId: 'user1',
            coupleId: 'couple1',
            date: '2024-12-25',
            moodRating: 6,
            connectionRating: 5,
            reflection: 'Family stress during holidays',
            isShared: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        suggestedFocus: [
          'Communication during stressful times',
          'Quality time without distractions',
          'Expressing appreciation daily',
        ],
        totalCheckIns: 28,
        streakDays: 7,
      };

      setMonthlyReport(mockReport);
      setCurrentMonth(mockReport.month);

    } catch (error) {
      console.error('Load monthly report error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return Colors.primarySage;
    if (score >= 6) return Colors.primarySage;
    if (score >= 4) return Colors.alertCoral;
    return Colors.alertCoral;
  };

  const getScoreText = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Needs Attention';
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Relationship Health</Text>
          <Text style={styles.subtitle}>{currentMonth}</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Mood</Text>
            <Text style={[styles.summaryValue, { color: getScoreColor(monthlyReport.averageMood) }]}>
              {monthlyReport.averageMood.toFixed(1)}
            </Text>
            <Text style={styles.summaryText}>{getScoreText(monthlyReport.averageMood)}</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Connection</Text>
            <Text style={[styles.summaryValue, { color: getScoreColor(monthlyReport.averageConnection) }]}>
              {monthlyReport.averageConnection.toFixed(1)}
            </Text>
            <Text style={styles.summaryText}>{getScoreText(monthlyReport.averageConnection)}</Text>
          </View>
        </View>

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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Happiest Days</Text>
          {monthlyReport.happiestDays.map((day, index) => (
            <View key={day.id} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayDate}>
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
                <View style={styles.dayRatings}>
                  <Text style={styles.dayRating}>😊 {day.moodRating}/10</Text>
                  <Text style={styles.dayRating}>❤️ {day.connectionRating}/10</Text>
                </View>
              </View>
              <Text style={styles.dayReflection}>{day.reflection}</Text>
            </View>
          ))}
        </View>

        {/* Toughest Days */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Toughest Days</Text>
          {monthlyReport.toughestDays.map((day, index) => (
            <View key={day.id} style={[styles.dayCard, styles.toughDayCard]}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayDate}>
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
                <View style={styles.dayRatings}>
                  <Text style={styles.dayRating}>😔 {day.moodRating}/10</Text>
                  <Text style={styles.dayRating}>💔 {day.connectionRating}/10</Text>
                </View>
              </View>
              <Text style={styles.dayReflection}>{day.reflection}</Text>
            </View>
          ))}
        </View>

        {/* Suggested Focus Areas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested Focus Areas</Text>
          {monthlyReport.suggestedFocus.map((focus, index) => (
            <View key={index} style={styles.focusCard}>
              <Text style={styles.focusIcon}>💡</Text>
              <Text style={styles.focusText}>{focus}</Text>
            </View>
          ))}
        </View>

        {/* Export Button */}
        <TouchableOpacity style={styles.exportButton} activeOpacity={0.8}>
          <Text style={styles.exportButtonText}>Generate Summary Card</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softCream,
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
    fontSize: Typography.fontSize.body,
    color: Colors.coolGrayText,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.padding,
  },
  errorText: {
    fontSize: Typography.fontSize.body,
    color: Colors.alertCoral,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primarySage,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  retryButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
  },
  header: {
    paddingHorizontal: Layout.padding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.fontSize.h1,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.coolGrayText,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },

  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: Layout.padding,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Layout.borderRadius.xl,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.small,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.coolGrayText,
    marginBottom: Spacing.sm,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontSize: Typography.fontSize.small,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.warmGrayText,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Layout.padding,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  statItem: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: Typography.fontSize.h2,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.primarySage,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.small,
    color: Colors.coolGrayText,
  },
  section: {
    marginHorizontal: Layout.padding,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.h2,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.warmGrayText,
    marginBottom: Spacing.md,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
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
    borderLeftColor: Colors.alertCoral,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dayDate: {
    fontSize: Typography.fontSize.small,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.coolGrayText,
  },
  dayRatings: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dayRating: {
    fontSize: Typography.fontSize.small,
    color: Colors.coolGrayText,
  },
  dayReflection: {
    fontSize: Typography.fontSize.body,
    color: Colors.warmGrayText,
    lineHeight: Typography.lineHeight.body,
    fontStyle: 'italic',
  },
  focusCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.shadow,
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
    marginRight: Spacing.md,
  },
  focusText: {
    fontSize: Typography.fontSize.body,
    color: Colors.warmGrayText,
    flex: 1,
    lineHeight: Typography.lineHeight.body,
  },
  exportButton: {
    backgroundColor: Colors.primarySage,
    marginHorizontal: Layout.padding,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exportButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default ReportsScreen;
