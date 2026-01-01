/**
 * ルーム作成画面
 * 
 * 新しいルームを作成し、待機所へ遷移します。
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Users, Plus } from '../components/icons/Icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { createRoom } from '../services/firestore';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes } from '../theme/fonts';

type RoomCreateProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoomCreate'>;
};

export function RoomCreate({ navigation }: RoomCreateProps) {
  const { user, updateNickname, isAuthenticated, signIn } = useAuth();
  const { t } = useLanguage();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(!isAuthenticated);

  // 認証状態の初期化
  useEffect(() => {
    if (!isAuthenticated) {
      signIn().catch((error) => {
        console.error('認証エラー:', error);
        Alert.alert(t.common.error, '認証に失敗しました');
      }).finally(() => {
        setInitializing(false);
      });
    } else {
      setInitializing(false);
    }
  }, [isAuthenticated]);

  // ユーザー情報が更新されたらニックネームを同期
  useEffect(() => {
    if (user?.nickname) {
      setNickname(user.nickname);
    }
  }, [user]);

  const handleCreate = async () => {
    if (!nickname.trim()) {
      Alert.alert(t.common.error, t.roomCreate.nicknamePlaceholder);
      return;
    }

    if (nickname.length > 20) {
      Alert.alert(t.common.error, t.roomCreate.nicknameHelper);
      return;
    }

    try {
      setLoading(true);

      // ニックネームを更新（変更された場合）
      if (nickname !== user?.nickname) {
        await updateNickname(nickname);
      }

      // ルームを作成（最大6人固定）
      const result = await createRoom(nickname, 6);

      // 待機所画面へ遷移
      navigation.navigate('Lobby', {
        roomId: result.roomId,
        roomCode: result.roomCode,
      });
    } catch (error: any) {
      console.error('ルーム作成エラー:', error);
      Alert.alert(t.common.error, 'ルームの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <LinearGradient
        colors={[colors.tavern.bg, colors.tavern.wood, colors.tavern.bg]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tavern.gold} />
            <Text style={styles.loadingText}>{t.common.loading}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

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
            disabled={loading}
          >
            <ArrowLeft size={24} color={colors.tavern.gold} />
          </Pressable>
          <Text style={styles.headerTitle}>{t.roomCreate.title}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.roomCreate.nickname}</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder={t.roomCreate.nicknamePlaceholder}
              placeholderTextColor={`${colors.tavern.cream}4D`}
              style={styles.input}
              maxLength={20}
              editable={!loading}
            />
            <Text style={styles.helperText}>{t.roomCreate.nicknameHelper}</Text>
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
            onPress={handleCreate}
            style={styles.createButton}
            disabled={loading || !nickname.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.tavern.bg} />
            ) : (
              <View style={styles.buttonContent}>
                <Plus size={20} color={colors.tavern.bg} />
                <Text style={styles.createButtonText}>{t.roomCreate.createButton}</Text>
              </View>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
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
  input: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.tavern.bg,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}4D`,
    color: colors.tavern.cream,
    fontSize: fontSizes.base,
  },
  helperText: {
    fontSize: fontSizes.sm,
    color: `${colors.tavern.cream}80`,
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
  createButton: {
    width: '100%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  createButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.tavern.bg,
  },
});

