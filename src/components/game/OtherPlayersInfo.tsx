import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { Player, GamePhase } from '../../types/game';
import { PlayMat } from './PlayMat';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';

interface OtherPlayersInfoProps {
  players: Player[];
  currentPlayerId: string;
  turnPlayerId: string | null;
  phase: GamePhase;
  highestBidderId: string | null;
  bidAmount: number;
  onSelectPlayer?: (playerId: string) => void;
}

export function OtherPlayersInfo({
  players,
  currentPlayerId,
  turnPlayerId,
  phase,
  highestBidderId,
  bidAmount,
  onSelectPlayer,
}: OtherPlayersInfoProps) {
  const otherPlayers = players.filter((p) => p.id !== currentPlayerId && p.isAlive);

  const getPlayerStatus = (player: Player): string | null => {
    if (phase === 'bidding') {
      if (player.hasPassed) {
        return 'Passed';
      }
      if (player.id === highestBidderId) {
        return `${bidAmount} cards`;
      }
      if (player.id === turnPlayerId) {
        return 'Your turn';
      }
    }
    if (phase === 'placement' && player.id === turnPlayerId) {
      return 'Your turn';
    }
    return null;
  };

  if (otherPlayers.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {otherPlayers.map((player) => {
        const status = getPlayerStatus(player);
        const isTurnPlayer = player.id === turnPlayerId;
        const isSelectable = phase === 'resolution' && onSelectPlayer;
        const isPassed = player.hasPassed && phase === 'bidding';

        return (
          <View
            key={player.id}
            style={[
              styles.playerContainer,
              isTurnPlayer && styles.playerContainerTurn,
              isPassed && styles.playerContainerPassed,
            ]}
          >
            <View style={[isPassed && styles.passedOverlay]}>
              <PlayMat
                cards={player.stack}
                themeColor={player.themeColor}
                wins={player.wins}
                playerName={player.name}
                size="sm"
                isTurn={isTurnPlayer}
                isSelectable={isSelectable}
                onSelect={isSelectable ? () => onSelectPlayer?.(player.id) : undefined}
              />
            </View>
            {isPassed && (
              <View style={styles.passedStamp}>
                <Text style={styles.passedStampText}>PASSED</Text>
              </View>
            )}
            {status && (
              <View style={[styles.statusBadge, isPassed && styles.statusBadgePassed]}>
                <Text style={[styles.statusText, isPassed && styles.statusTextPassed]}>
                  {status}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={[styles.handCount, isPassed && styles.handCountPassed]}>
                Hand: {player.hand.length}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 180, // プレイマット縮小に合わせて高さを調整（200→180）
  },
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  playerContainer: {
    alignItems: 'center',
    gap: 2, // プレイマット縮小に合わせてギャップを縮小（spacing.xs=4→2）
    padding: spacing.xs, // プレイマット縮小に合わせてパディングを縮小（spacing.sm=8→spacing.xs=4）
    paddingBottom: spacing.xs, // 下部の余白を明示的に設定
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.tavern.wood}33`,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}33`,
  },
  playerContainerTurn: {
    backgroundColor: `${colors.tavern.gold}33`,
    borderColor: colors.tavern.gold,
    borderWidth: 2,
  },
  playerContainerPassed: {
    backgroundColor: `${colors.tavern.wood}1A`,
    borderColor: `${colors.tavern.gold}1A`,
    opacity: 0.6,
  },
  passedOverlay: {
    opacity: 0.5,
  },
  passedStamp: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -15 }, { rotate: '-15deg' }],
    backgroundColor: `${colors.tavern.bg}CC`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.tavern.cream,
    zIndex: 10,
  },
  passedStampText: {
    fontSize: fontSizes.lg,
    color: colors.tavern.cream,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  statusBadge: {
    backgroundColor: colors.tavern.bg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.tavern.gold,
  },
  statusBadgePassed: {
    opacity: 0.5,
  },
  statusText: {
    fontSize: fontSizes.xs,
    color: colors.tavern.gold,
    fontWeight: '600',
  },
  statusTextPassed: {
    opacity: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  handCount: {
    fontSize: fontSizes.xs,
    color: colors.tavern.cream,
    opacity: 0.8,
  },
  handCountPassed: {
    opacity: 0.4,
  },
});

