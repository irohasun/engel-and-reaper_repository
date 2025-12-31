import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Player } from '../../types/game';
import { Modal } from './Modal';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';

interface NextPlayerSelectorModalProps {
  visible: boolean;
  players: Player[];
  onSelectPlayer: (playerId: string) => void;
}

/**
 * 次の先手プレイヤーを選択するモーダル
 * 自分の死神で脱落した場合に表示される
 */
export function NextPlayerSelectorModal({
  visible,
  players,
  onSelectPlayer,
}: NextPlayerSelectorModalProps) {
  // 生存プレイヤーのみ選択可能
  const alivePlayers = players.filter((p) => p.isAlive);

  const playerColorMap: Record<string, string> = {
    blue: colors.player.blue,
    red: colors.player.red,
    yellow: colors.player.yellow,
    green: colors.player.green,
    purple: colors.player.purple,
    pink: colors.player.pink,
  };

  return (
    <Modal visible={visible} onClose={() => {}} title="Select Next Player">
      <View style={styles.content}>
        <Text style={styles.description}>
          You have been eliminated. Please select the next player to start the next round.
        </Text>
        <View style={styles.playerList}>
          {alivePlayers.map((player) => (
            <Pressable
              key={player.id}
              onPress={() => onSelectPlayer(player.id)}
              style={({ pressed }) => [
                styles.playerItem,
                pressed && styles.playerItemPressed,
              ]}
            >
              <LinearGradient
                colors={[colors.tavern.woodLight, colors.tavern.wood]}
                style={styles.playerGradient}
              >
                <View
                  style={[
                    styles.playerColor,
                    { backgroundColor: playerColorMap[player.themeColor] },
                  ]}
                />
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerStats}>
                    {player.wins} win{player.wins !== 1 ? 's' : ''} • {player.hand.length + player.stack.length} cards
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  description: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  playerList: {
    gap: spacing.sm,
  },
  playerItem: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  playerItemPressed: {
    opacity: 0.7,
  },
  playerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}4D`,
    gap: spacing.md,
  },
  playerColor: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.tavern.gold,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: fontSizes.lg,
    color: colors.tavern.cream,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  playerStats: {
    fontSize: fontSizes.sm,
    color: colors.tavern.cream,
    opacity: 0.7,
  },
});

