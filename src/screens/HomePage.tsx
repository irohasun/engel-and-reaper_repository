import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Button } from '../components/ui/Button';
import { Anchor, Users, Compass, Sparkles } from '../components/icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes } from '../theme/fonts';

type HomePageProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export function HomePage({ navigation }: HomePageProps) {
  const { language, t, setLanguage } = useLanguage();

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
            <Text style={styles.title}>{t.home.title}</Text>
            <Text style={styles.subtitle}>A Tavern Bluff Game</Text>
          </View>

          {/* 言語切り替えトグルボタン */}
          <Pressable
            onPress={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
            style={styles.languageToggleContainer}
          >
            <View style={[
              styles.languageToggleTrack,
              language === 'en' && styles.languageToggleTrackActive
            ]}>
              <View style={styles.languageToggleLabels}>
                <Text style={[
                  styles.languageToggleLabel,
                  language === 'en' && styles.languageToggleLabelActive
                ]}>🇺🇸</Text>
                <Text style={[
                  styles.languageToggleLabel,
                  language === 'ja' && styles.languageToggleLabelActive
                ]}>🇯🇵</Text>
              </View>
              <View style={[
                styles.languageToggleThumb,
                language === 'ja' && styles.languageToggleThumbActive
              ]} />
            </View>
          </Pressable>

          <View style={styles.buttonsContainer}>
            <Button
              variant="gold"
              size="lg"
              onPress={() => navigation.navigate('RoomCreate')}
              style={styles.button}
            >
              <View style={styles.buttonContent}>
                <Compass size={20} color={colors.tavern.bg} />
                <Text style={styles.buttonText}>{t.home.createRoom}</Text>
              </View>
            </Button>

            <Button
              variant="wood"
              size="lg"
              onPress={() => navigation.navigate('RoomJoin')}
              style={styles.button}
            >
              <View style={styles.buttonContent}>
                <Users size={20} color={colors.tavern.cream} />
                <Text style={[styles.buttonText, styles.buttonTextWhite]}>
                  {t.home.joinRoom}
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
                {t.home.testMode}
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
    marginTop: spacing['xl'],
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
  languageToggleContainer: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  languageToggleTrack: {
    width: 80,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.tavern.wood}80`,
    borderWidth: 2,
    borderColor: `${colors.tavern.gold}4D`,
    position: 'relative',
    justifyContent: 'center',
  },
  languageToggleTrackActive: {
    backgroundColor: `${colors.tavern.wood}80`,
    borderColor: `${colors.tavern.gold}4D`,
  },
  languageToggleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  languageToggleLabel: {
    fontSize: fontSizes.lg,
    opacity: 0.6,
  },
  languageToggleLabelActive: {
    opacity: 1,
  },
  languageToggleThumb: {
    position: 'absolute',
    left: 2,
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.tavern.gold,
  },
  languageToggleThumbActive: {
    left: 42, // 80 - 36 - 2 (width - thumbWidth - padding)
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
    marginVertical: spacing.sm,
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
