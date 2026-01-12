export const colors = {
  tavern: {
    bg: '#1a0f0a',
    wood: '#2c1810',
    woodLight: '#3d2317',
    leather: '#8b4513',
    gold: '#c9a227',
    goldLight: '#d4af37',
    parchment: '#f5deb3',
    cream: '#f5f5dc',
    ink: '#1a1a1a',
    green: '#2e5a3a',
    red: '#8b2500',
  },
  player: {
    blue: '#1e3a5f',
    red: '#8b2500',
    yellow: '#b8860b',
    green: '#2e5a3a',
    purple: '#4a2a6a',
    pink: '#8b4567',
  },
  playerDark: {
    blue: '#0f1d30',
    red: '#451300',
    yellow: '#5c4305',
    green: '#172d1d',
    purple: '#251535',
    pink: '#452233',
  },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  gold: {
    shadowColor: colors.tavern.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
};
