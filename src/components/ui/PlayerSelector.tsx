import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Player } from '../../types/game';
import { colors, shadows } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSizes } from '../../theme/fonts';
import { Button } from './Button';
import { useLanguage } from '../../contexts/LanguageContext';

interface PlayerSelectorProps {
  players: Player[];
  currentPlayerId: string | null;
  turnPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
}

export function PlayerSelector({
  players,
  currentPlayerId,
  turnPlayerId,
  onSelectPlayer,
}: PlayerSelectorProps) {
  const { t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const currentPlayerName = currentPlayer?.name || t.common.unknown;

  const playerColorMap: Record<string, string> = {
    blue: colors.player.blue,
    red: colors.player.red,
    yellow: colors.player.yellow,
    green: colors.player.green,
    purple: colors.player.purple,
    pink: colors.player.pink,
  };

  const handleSelect = (playerId: string) => {
    onSelectPlayer(playerId);
    setModalVisible(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <LinearGradient
          colors={[colors.tavern.woodLight, colors.tavern.wood]}
          style={styles.buttonGradient}
        >
          <View style={styles.buttonContent}>
            <View
              style={[
                styles.colorIndicator,
                currentPlayer && {
                  backgroundColor: playerColorMap[currentPlayer.themeColor],
                },
              ]}
            />
            <Text style={styles.buttonText}>{currentPlayerName}</Text>
            {currentPlayerId === turnPlayerId && (
              <View style={styles.turnBadge}>
                <Text style={styles.turnBadgeText}>{t.game.turn}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[colors.tavern.wood, colors.tavern.bg]}
              style={styles.modalGradient}
            >
              <Text style={styles.modalTitle}>{t.common.selectPlayer}</Text>
              <View style={styles.playerList}>
                {players.map((player) => {
                  const isCurrent = player.id === currentPlayerId;
                  const isTurnPlayer = player.id === turnPlayerId;
                  const isAlive = player.isAlive;

                  return (
                    <Pressable
                      key={player.id}
                      onPress={() => isAlive && handleSelect(player.id)}
                      disabled={!isAlive}
                      style={({ pressed }) => [
                        styles.playerItem,
                        isCurrent && styles.playerItemActive,
                        !isAlive && styles.playerItemDisabled,
                        pressed && styles.playerItemPressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.playerColor,
                          { backgroundColor: playerColorMap[player.themeColor] },
                        ]}
                      />
                      <View style={styles.playerInfo}>
                        <Text
                          style={[
                            styles.playerName,
                            isCurrent && styles.playerNameActive,
                            !isAlive && styles.playerNameDisabled,
                          ]}
                        >
                          {player.name}
                        </Text>
                        {!isAlive && (
                          <Text style={styles.playerStatus}>{t.common.eliminated}</Text>
                        )}
                      </View>
                      {isTurnPlayer && (
                        <View style={styles.turnBadgeSmall}>
                          <Text style={styles.turnBadgeTextSmall}>{t.game.turn}</Text>
                        </View>
                      )}
                      {isCurrent && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              <Button
                variant="ghost"
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                {t.common.close}
              </Button>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  buttonGradient: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}4D`,
    borderRadius: borderRadius.lg,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.tavern.gold,
  },
  buttonText: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
    fontWeight: '600',
  },
  turnBadge: {
    backgroundColor: colors.tavern.gold,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  turnBadgeText: {
    fontSize: fontSizes.xs,
    color: colors.tavern.bg,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    ...shadows.gold,
  },
  modalGradient: {
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: `${colors.tavern.gold}80`,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    color: colors.tavern.gold,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  playerList: {
    gap: spacing.sm,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.tavern.woodLight}66`,
    borderWidth: 1,
    borderColor: `${colors.tavern.gold}33`,
    gap: spacing.sm,
  },
  playerItemActive: {
    backgroundColor: `${colors.tavern.gold}33`,
    borderColor: colors.tavern.gold,
  },
  playerItemDisabled: {
    opacity: 0.5,
  },
  playerItemPressed: {
    opacity: 0.7,
  },
  playerColor: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.tavern.gold,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: fontSizes.base,
    color: colors.tavern.cream,
    fontWeight: '500',
  },
  playerNameActive: {
    color: colors.tavern.gold,
    fontWeight: '700',
  },
  playerNameDisabled: {
    textDecorationLine: 'line-through',
  },
  playerStatus: {
    fontSize: fontSizes.xs,
    color: colors.tavern.cream,
    opacity: 0.6,
    marginTop: 2,
  },
  turnBadgeSmall: {
    backgroundColor: colors.tavern.gold,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  turnBadgeTextSmall: {
    fontSize: fontSizes.xs,
    color: colors.tavern.bg,
    fontWeight: '700',
  },
  checkmark: {
    fontSize: fontSizes.lg,
    color: colors.tavern.gold,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: spacing.sm,
  },
});

