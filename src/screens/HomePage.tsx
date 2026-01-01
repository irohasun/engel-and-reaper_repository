import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
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

          {/* 言語選択ラジオボタン */}
          <View style={styles.languageContainer}>
            <Pressable
              onPress={() => setLanguage('ja')}
              style={[
                styles.languageButton,
                language === 'ja' && styles.languageButtonActive,
              ]}
            >
              <Text style={styles.flagIcon}>🇯🇵</Text>
              <Text style={[
                styles.languageText,
                language === 'ja' && styles.languageTextActive
              ]}>日本語</Text>
              <View style={[
                styles.radioButton,
                language === 'ja' && styles.radioButtonActive
              ]}>
                {language === 'ja' && <View style={styles.radioButtonInner} />}
              </View>
            </Pressable>

            <Pressable
              onPress={() => setLanguage('en')}
              style={[
                styles.languageButton,
                language === 'en' && styles.languageButtonActive,
              ]}
            >
              <Text style={styles.flagIcon}>🇺🇸</Text>
              <Text style={[
                styles.languageText,
                language === 'en' && styles.languageTextActive
              ]}>English</Text>
              <View style={[
                styles.radioButton,
                language === 'en' && styles.radioButtonActive
              ]}>
                {language === 'en' && <View style={styles.radioButtonInner} />}
              </View>
            </Pressable>
          </View>

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
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginVertical: spacing.lg,
    backgroundColor: `${colors.tavern.wood}33`,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}1A`,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  languageButtonActive: {
    backgroundColor: `${colors.tavern.gold}1A`,
  },
  flagIcon: {
    fontSize: fontSizes.xl,
  },
  languageText: {
    color: `${colors.tavern.cream}80`,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  languageTextActive: {
    color: colors.tavern.gold,
  },
  radioButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: `${colors.tavern.gold}4D`,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  radioButtonActive: {
    borderColor: colors.tavern.gold,
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.tavern.gold,
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
