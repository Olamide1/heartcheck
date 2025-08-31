import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants';

interface LogoProps {
  size?: number;
  showShadow?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 80, showShadow = true }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Main heart shape */}
      <View style={[styles.heartShape, { width: size * 0.9, height: size * 0.9 }]}>
        {/* Left heart curve - positioned for perfect heart shape */}
        <View style={[styles.heartLeft]} />
        {/* Right heart curve - positioned for perfect heart shape */}
        <View style={[styles.heartRight]} />
        {/* Bottom point - positioned to complete the heart */}
        <View style={styles.heartBottom} />
      </View>
      
      {/* Subtle inner glow */}
      <View style={[styles.heartGlow]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heartShape: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  heartLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primarySage,
  },
  heartRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primarySage,
  },
  heartBottom: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    right: 16,
    height: 16,
    backgroundColor: Colors.primarySage,
    borderRadius: 8,
  },
  heartGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: Colors.primarySage,
    borderRadius: 20,
    opacity: 0.2,
  },
});

export default Logo;
