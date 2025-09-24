import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Linking } from 'react-native';
import DisclaimerNote from '../../components/DisclaimerNote';

const LegalScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Legal & Sources</Text>

        <DisclaimerNote style={{ marginBottom: 16 }} />

        <Text style={styles.sectionTitle}>About HeartCheck</Text>
        <Text style={styles.paragraph}>
          HeartCheck is a wellness and reflection app that helps partners track daily check-ins and notice patterns. The app offers general educational content and practical prompts intended to support healthy habits and communication.
        </Text>
        <Text style={styles.paragraph}>
          HeartCheck does not provide medical, mental health, or crisis services and should not be used to diagnose or treat any condition. Always seek the advice of a qualified professional with any questions you may have about well-being or relationships.
        </Text>

        <Text style={styles.sectionTitle}>When to Seek Professional Help</Text>
        <Text style={styles.paragraph}>
          If you or your partner are experiencing significant distress, safety concerns, or symptoms that interfere with daily life, consider contacting a licensed therapist, counselor, physician, or local support service. In an emergency, call your local emergency number.
        </Text>
        <View style={styles.sources}>
          <Text style={styles.sourceItem} onPress={() => Linking.openURL('https://988lifeline.org/')}>• U.S. 988 Suicide & Crisis Lifeline: 988 or 988lifeline.org</Text>
          <Text style={styles.sourceItem} onPress={() => Linking.openURL('https://www.thehotline.org/')}>• National Domestic Violence Hotline (U.S.): thehotline.org</Text>
        </View>

        <Text style={styles.sectionTitle}>Selected Sources (Education & Reference)</Text>
        <View style={styles.sources}>
          <Text style={styles.sourceItem} onPress={() => Linking.openURL('https://www.apa.org/topics/relationships')}>• American Psychological Association (APA): Relationships</Text>
          <Text style={styles.sourceItem} onPress={() => Linking.openURL('https://www.apa.org/topics/stress')}>• APA: Stress</Text>
          <Text style={styles.sourceItem} onPress={() => Linking.openURL('https://www.nimh.nih.gov/health/topics')}>• National Institute of Mental Health (NIMH): Mental Health Topics</Text>
          <Text style={styles.sourceItem} onPress={() => Linking.openURL('https://www.cdc.gov/mentalhealth/learn/index.htm')}>• Centers for Disease Control and Prevention (CDC): Learn About Mental Health</Text>
          <Text style={styles.sourceItem} onPress={() => Linking.openURL('https://www.who.int/health-topics/mental-health')}>• World Health Organization (WHO): Mental health</Text>
        </View>

        <Text style={styles.sectionTitle}>How We Use This Information</Text>
        <Text style={styles.paragraph}>
          HeartCheck summarizes your self-reported check-ins to surface simple trends and prompts. Any scores or suggestions are illustrative and based on your inputs—they are not clinical assessments.
        </Text>

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.paragraph}>Questions or feedback? Email support@heartcheck.app.</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  sources: {
    marginTop: 8,
  },
  sourceItem: {
    fontSize: 14,
    color: '#2563EB',
    marginBottom: 8,
    textDecorationLine: 'underline',
  },
});

export default LegalScreen;


