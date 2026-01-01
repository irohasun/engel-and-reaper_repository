import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from './src/contexts/GameContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { initializeFirebase } from './src/config/firebase';
import { HomePage } from './src/screens/HomePage';
import { RoomCreate } from './src/screens/RoomCreate';
import { RoomJoin } from './src/screens/RoomJoin';
import { Lobby } from './src/screens/Lobby';
import { TestModeSetup } from './src/screens/TestModeSetup';
import { GameScreen } from './src/screens/GameScreen';
import { ResultScreen } from './src/screens/ResultScreen';

export type RootStackParamList = {
  Home: undefined;
  RoomCreate: undefined;
  RoomJoin: undefined;
  Lobby: { roomId: string; roomCode: string };
  TestSetup: undefined;
  Game: { roomId?: string; mode: 'test' | 'online' };
  Result: { winnerId: string; winnerName?: string; winnerColor?: string; roomId?: string; roomCode?: string; mode?: 'test' | 'online' };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // Firebase と AdMob を初期化
  useEffect(() => {
    initializeFirebase();
    
    // AdMobはWeb環境ではサポートされていないため、ネイティブプラットフォームのみで初期化
    if (Platform.OS !== 'web') {
      import('./src/utils/admob').then(({ initializeAdMob }) => {
    initializeAdMob();
      }).catch(error => {
        console.error('AdMob initialization error:', error);
      });
    }
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
    <GameProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#1a0f0a' },
          }}
        >
          <Stack.Screen name="Home" component={HomePage} />
            <Stack.Screen name="RoomCreate" component={RoomCreate} />
            <Stack.Screen name="RoomJoin" component={RoomJoin} />
            <Stack.Screen name="Lobby" component={Lobby} />
          <Stack.Screen name="TestSetup" component={TestModeSetup} />
          <Stack.Screen name="Game" component={GameScreen} />
          <Stack.Screen name="Result" component={ResultScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GameProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
