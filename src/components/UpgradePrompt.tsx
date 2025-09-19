import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Layout } from '../constants';

const { width, height } = Dimensions.get('window');

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  title?: string;
  message?: string;
  feature?: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  visible,
  onClose,
  onUpgrade,
  title = "Upgrade Required",
  message = "This feature requires an active subscription.",
  feature = "premium feature"
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.content}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🔒</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Message */}
            <Text style={styles.message}>
              {message}
            </Text>

            {/* Feature */}
            <View style={styles.featureContainer}>
              <Text style={styles.featureLabel}>Feature:</Text>
              <Text style={styles.featureName}>{feature}</Text>
            </View>

            {/* Benefits */}
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>With HeartCheck Premium:</Text>
              <View style={styles.benefitsList}>
                <Text style={styles.benefitItem}>✓ Unlimited daily check-ins</Text>
                <Text style={styles.benefitItem}>✓ Detailed relationship reports</Text>
                <Text style={styles.benefitItem}>✓ Pattern detection & alerts</Text>
                <Text style={styles.benefitItem}>✓ Guided exercises & tips</Text>
                <Text style={styles.benefitItem}>✓ Partner connection insights</Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Maybe Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={onUpgrade}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.primarySage, Colors.primarySageDark]}
                  style={styles.upgradeButtonGradient}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    padding: Spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: Typography.fontSize.h2,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: Typography.fontSize.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  featureContainer: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.lg,
  },
  featureLabel: {
    fontSize: Typography.fontSize.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  featureName: {
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  benefitsContainer: {
    marginBottom: Spacing.xl,
  },
  benefitsTitle: {
    fontSize: Typography.fontSize.h4,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  benefitsList: {
    gap: Spacing.xs,
  },
  benefitItem: {
    fontSize: Typography.fontSize.body,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.coolGrayText,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.coolGrayText,
  },
  upgradeButton: {
    flex: 1,
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
  },
  upgradeButtonGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textInverse,
  },
});

export default UpgradePrompt;
