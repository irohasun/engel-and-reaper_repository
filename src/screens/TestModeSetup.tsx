import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Users, Play } from '../components/icons/Icons';
import { useTestMode } from '../contexts/GameContext';
import { useLanguage } from '../contexts/LanguageContext';
import { DEFAULT_PLAYER_NAMES_JA, DEFAULT_PLAYER_NAMES_EN, THEME_COLORS } from '../constants/game';
import type { ThemeColor } from '../types/game';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes } from '../theme/fonts';

type TestModeSetupProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TestSetup'>;
};

export function TestModeSetup({ navigation }: TestModeSetupProps) {
  const { t, language } = useLanguage();
  const [playerCount, setPlayerCount] = useState(3);
  const defaultNames = language === 'ja' ? DEFAULT_PLAYER_NAMES_JA : DEFAULT_PLAYER_NAMES_EN;
  const [names, setNames] = useState<string[]>(defaultNames.slice(0, 6));
  const { initializeTestGame } = useTestMode();

  const handleStart = () => {
    initializeTestGame(playerCount, names.slice(0, playerCount));
    navigation.navigate('Game', { mode: 'test' });
  };

  const colorBgs: Record<ThemeColor, string> = {
    blue: colors.player.blue,
    red: colors.player.red,
    yellow: colors.player.yellow,
    green: colors.player.green,
    purple: colors.player.purple,
    pink: colors.player.pink,
  };

  return (
    <LinearGradient
      colors={[colors.tavern.bg, colors.tavern.wood, colors.tavern.bg]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors.tavern.gold} />
          </Pressable>
          <Text style={styles.headerTitle}>{t.home.testMode}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={20} color={colors.tavern.gold} />
              <Text style={styles.sectionTitle}>{t.lobby.players}</Text>
            </View>

            <View style={styles.playerCountContainer}>
              {[2, 3, 4, 5, 6].map((count) => (
                <Pressable
                  key={count}
                  onPress={() => setPlayerCount(count)}
                  style={[
                    styles.countButton,
                    playerCount === count && styles.countButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countButtonText,
                      playerCount === count && styles.countButtonTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.roomCreate.nickname}</Text>

            {Array.from({ length: playerCount }).map((_, index) => (
              <View key={index} style={styles.playerRow}>
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: colorBgs[THEME_COLORS[index]] },
                  ]}
                />
                <TextInput
                  value={names[index]}
                  onChangeText={(text) => {
                    const newNames = [...names];
                    newNames[index] = text;
                    setNames(newNames);
                  }}
                  placeholder={`${t.common.player} ${index + 1}`}
                  placeholderTextColor={`${colors.tavern.cream}4D`}
                  style={styles.input}
                />
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.roomCreate.rulesTitle}</Text>
            <Text style={styles.infoText}>• {t.roomCreate.rule1}</Text>
            <Text style={styles.infoText}>• {t.roomCreate.rule2}</Text>
            <Text style={styles.infoText}>• {t.roomCreate.rule3}</Text>
            <Text style={styles.infoText}>• {t.roomCreate.rule4}</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            variant="gold"
            size="lg"
            onPress={handleStart}
            style={styles.startButton}
          >
            <View style={styles.buttonContent}>
              <Play size={20} color={colors.tavern.bg} />
              <Text style={styles.startButtonText}>{t.lobby.startGame}</Text>
            </View>
          </Button>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.tavern.gold}33`,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    color: colors.tavern.gold,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    backgroundColor: `${colors.tavern.wood}4D`,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}33`,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    color: colors.tavern.cream,
    fontWeight: '600',
  },
  playerCountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  countButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.tavern.wood,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}4D`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countButtonActive: {
    backgroundColor: colors.tavern.gold,
    transform: [{ scale: 1.1 }],
  },
  countButtonText: {
    fontSize: fontSizes.lg,
    color: colors.tavern.cream,
    fontWeight: '600',
  },
  countButtonTextActive: {
    color: colors.tavern.bg,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorIndicator: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: `${colors.tavern.gold}80`,
  },
  input: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.tavern.bg,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}4D`,
    color: colors.tavern.cream,
    fontSize: fontSizes.base,
  },
  infoText: {
    fontSize: fontSizes.sm,
    color: `${colors.tavern.cream}B3`,
    lineHeight: fontSizes.sm * 1.6,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${colors.tavern.gold}33`,
  },
  startButton: {
    width: '100%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  startButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.tavern.bg,
  },
});
