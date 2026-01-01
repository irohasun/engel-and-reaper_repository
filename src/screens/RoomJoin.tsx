/**
 * ルーム参加画面
 * 
 * 4桁の合言葉を入力してルームに参加します。
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Button } from '../components/ui/Button';
import { ArrowLeft, LogIn } from '../components/icons/Icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { joinRoom } from '../services/firestore';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSizes } from '../theme/fonts';

type RoomJoinProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoomJoin'>;
};

const CODE_LENGTH = 4;

export function RoomJoin({ navigation }: RoomJoinProps) {
  const { user, updateNickname, isAuthenticated, signIn } = useAuth();
  const { t } = useLanguage();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [code, setCode] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(!isAuthenticated);
  
  const inputRefs = useRef<Array<TextInput | null>>([]);

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

  const handleCodeChange = (index: number, value: string) => {
    // 数字とアルファベットのみ許可
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (sanitized.length > 1) {
      // 複数文字ペーストされた場合
      const chars = sanitized.slice(0, CODE_LENGTH).split('');
      const newCode = [...code];
      chars.forEach((char, i) => {
        if (index + i < CODE_LENGTH) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);
      
      // 最後の入力欄にフォーカス
      const nextIndex = Math.min(index + chars.length, CODE_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
    } else if (sanitized.length === 1) {
      // 1文字入力
      const newCode = [...code];
      newCode[index] = sanitized;
      setCode(newCode);
      
      // 次の入力欄にフォーカス
      if (index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else {
      // バックスペースなど
      const newCode = [...code];
      newCode[index] = '';
      setCode(newCode);
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && code[index] === '' && index > 0) {
      // 前の入力欄にフォーカス
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleJoin = async () => {
    const roomCode = code.join('');
    
    if (roomCode.length !== CODE_LENGTH) {
      Alert.alert(t.common.error, t.roomJoin.roomCodePlaceholder);
      return;
    }

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

      // ルームに参加
      const result = await joinRoom(roomCode, nickname);

      // 待機所画面へ遷移
      navigation.navigate('Lobby', {
        roomId: result.roomId,
        roomCode: roomCode,
      });
    } catch (error: any) {
      console.error('ルーム参加エラー:', error);
      
      let errorMessage = 'ルームへの参加に失敗しました';
      if (error.message?.includes('not found')) {
        errorMessage = t.roomJoin.notFound;
      } else if (error.message?.includes('full')) {
        errorMessage = 'ルームが満員です';
      } else if (error.message?.includes('already started')) {
        errorMessage = 'ゲームは既に開始されています';
      }
      
      Alert.alert(t.common.error, errorMessage);
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

  const isCodeComplete = code.every(char => char !== '');

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
          <Text style={styles.headerTitle}>{t.roomJoin.title}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.roomJoin.roomCode}</Text>
            <Text style={styles.helperText}>
              {t.language === 'ja' ? 'ホストから共有された4桁の合言葉を入力してください' : 'Enter the 4-digit code shared by the host'}
            </Text>
            
            <View style={styles.codeContainer}>
              {code.map((char, index) => (
                <TextInput
                  key={index}
                  ref={ref => inputRefs.current[index] = ref}
                  value={char}
                  onChangeText={(value) => handleCodeChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  style={[
                    styles.codeInput,
                    char !== '' && styles.codeInputFilled,
                  ]}
                  maxLength={1}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  keyboardType="default"
                  editable={!loading}
                  selectTextOnFocus
                />
              ))}
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>{t.roomJoin.notFound}場合 / If room not found:</Text>
            <Text style={styles.infoText}>• {t.language === 'ja' ? '合言葉が正しいか確認してください' : 'Check if the room code is correct'}</Text>
            <Text style={styles.infoText}>• {t.language === 'ja' ? 'ルームが既に満員または開始済みの可能性があります' : 'Room might be full or already started'}</Text>
            <Text style={styles.infoText}>• {t.language === 'ja' ? 'ホストに新しいルームの作成を依頼してください' : 'Ask host to create a new room'}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            variant="gold"
            size="lg"
            onPress={handleJoin}
            style={styles.joinButton}
            disabled={loading || !isCodeComplete || !nickname.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.tavern.bg} />
            ) : (
              <View style={styles.buttonContent}>
                <LogIn size={20} color={colors.tavern.bg} />
                <Text style={styles.joinButtonText}>{t.roomJoin.joinButton}</Text>
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
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  codeInput: {
    width: 60,
    height: 70,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.tavern.bg,
    borderWidth: 2,
    borderColor: `${colors.tavern.gold}4D`,
    color: colors.tavern.cream,
    fontSize: fontSizes['3xl'],
    fontWeight: 'bold',
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: colors.tavern.gold,
    backgroundColor: `${colors.tavern.gold}1A`,
  },
  infoSection: {
    backgroundColor: `${colors.tavern.wood}33`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  infoTitle: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
    fontWeight: '600',
    marginBottom: spacing.xs,
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
  joinButton: {
    width: '100%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  joinButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.tavern.bg,
  },
});

