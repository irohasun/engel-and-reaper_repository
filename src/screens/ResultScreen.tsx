import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { Button } from '../components/ui/Button';
import { Trophy, Home, RotateCcw } from '../components/icons/Icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSizes } from '../theme/fonts';

type ResultScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Result'>;
  route: RouteProp<RootStackParamList, 'Result'>;
};

export function ResultScreen({ navigation }: ResultScreenProps) {
  return (
    <LinearGradient
      colors={[colors.tavern.bg, colors.tavern.wood, colors.tavern.bg]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Trophy size={96} color={colors.tavern.gold} />
            <Text style={styles.title}>Victory!</Text>
            <Text style={styles.subtitle}>Winner Name wins the game!</Text>
          </View>

          <View style={styles.buttons}>
            <Button
              variant="gold"
              size="lg"
              onPress={() => navigation.navigate('TestSetup')}
              style={styles.button}
            >
              <View style={styles.buttonContent}>
                <RotateCcw size={20} color={colors.tavern.bg} />
                <Text style={styles.buttonText}>Play Again</Text>
              </View>
            </Button>

            <Button
              variant="wood"
              size="lg"
              onPress={() => navigation.navigate('Home')}
              style={styles.button}
            >
              <View style={styles.buttonContent}>
                <Home size={20} color={colors.tavern.cream} />
                <Text style={[styles.buttonText, styles.buttonTextWhite]}>Home</Text>
              </View>
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-around',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: fontSizes['3xl'],
    color: colors.tavern.gold,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: fontSizes.xl,
    color: colors.tavern.cream,
    textAlign: 'center',
  },
  buttons: {
    gap: spacing.md,
  },
  button: {
    width: '100%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.tavern.bg,
  },
  buttonTextWhite: {
    color: colors.tavern.cream,
  },
});
