import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from './src/contexts/GameContext';
import { HomePage } from './src/screens/HomePage';
import { TestModeSetup } from './src/screens/TestModeSetup';
import { GameScreen } from './src/screens/GameScreen';
import { ResultScreen } from './src/screens/ResultScreen';

export type RootStackParamList = {
  Home: undefined;
  TestSetup: undefined;
  Game: undefined;
  Result: { winnerId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
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
          <Stack.Screen name="TestSetup" component={TestModeSetup} />
          <Stack.Screen name="Game" component={GameScreen} />
          <Stack.Screen name="Result" component={ResultScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GameProvider>
  );
}
