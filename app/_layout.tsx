import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  // Set default orientation to portrait
  useEffect(() => {
    const setOrientation = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch (e) {
        console.log('Error setting orientation:', e);
      }
    };
    
    setOrientation();

    return () => {
      ScreenOrientation.unlockAsync().catch(e => console.log('Error unlocking orientation:', e));
    };
  }, []);

  return (
    <>
      <Stack>
        <Stack.Screen 
          name="signboard" 
          options={{
            headerShown: false,
          }} 
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
