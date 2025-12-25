import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Button } from '../components/ui/Button';
import { Anchor, Users, Compass, Sparkles } from '../components/icons/Icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes } from '../theme/fonts';

type HomePageProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export function HomePage({ navigation }: HomePageProps) {
  return (
    <LinearGradient
      colors={[colors.tavern.bg, colors.tavern.wood, colors.tavern.bg]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Anchor size={80} color={colors.tavern.gold} />
              <View style={styles.sparkle}>
                <Sparkles size={32} color={colors.tavern.goldLight} />
              </View>
            </View>
            <Text style={styles.title}>Angel & Reaper</Text>
            <Text style={styles.subtitle}>A Tavern Bluff Game</Text>
          </View>

          <View style={styles.buttonsContainer}>
            <Button
              variant="gold"
              size="lg"
              onPress={() => {}}
              style={styles.button}
            >
              <View style={styles.buttonContent}>
                <Compass size={20} color={colors.tavern.bg} />
                <Text style={styles.buttonText}>Create Room</Text>
              </View>
            </Button>

            <Button
              variant="wood"
              size="lg"
              onPress={() => {}}
              style={styles.button}
            >
              <View style={styles.buttonContent}>
                <Users size={20} color={colors.tavern.cream} />
                <Text style={[styles.buttonText, styles.buttonTextWhite]}>
                  Join Room
                </Text>
              </View>
            </Button>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              variant="ghost"
              size="lg"
              onPress={() => navigation.navigate('TestSetup')}
              style={styles.button}
            >
              <Text style={[styles.buttonText, styles.buttonTextWhite]}>
                Test Mode
              </Text>
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>2-6 Players | Bluff & Bid</Text>
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
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing['3xl'],
  },
  iconContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  sparkle: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  title: {
    fontSize: fontSizes['4xl'],
    color: colors.tavern.gold,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: `${colors.tavern.cream}B3`,
    textAlign: 'center',
  },
  buttonsContainer: {
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${colors.tavern.gold}4D`,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: fontSizes.sm,
    color: `${colors.tavern.cream}80`,
  },
  footer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  footerText: {
    fontSize: fontSizes.sm,
    color: `${colors.tavern.cream}66`,
  },
});
