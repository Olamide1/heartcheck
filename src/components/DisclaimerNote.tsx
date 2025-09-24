import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';

type DisclaimerNoteProps = {
  style?: any;
};

const DisclaimerNote: React.FC<DisclaimerNoteProps> = ({ style }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Important</Text>
      <Text style={styles.text}>
        HeartCheck provides wellness and relationship insights for general informational purposes only and is not a substitute for professional advice, diagnosis, or treatment. If you have concerns about your mental or relationship health, please consult a qualified professional.
      </Text>
      <Text
        style={styles.link}
        onPress={() => Linking.openURL('https://heartcheck.xyz/legal')}
      >
        Learn more and view sources
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  title: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  text: {
    color: '#78350F',
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    textDecorationLine: 'underline',
  },
});

export default DisclaimerNote;


