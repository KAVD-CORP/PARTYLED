import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const CLIENT_ID_KEY = 'partyled-client-id';

function createId(): string {
  return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable non-secret identifier used to reclaim a room cell after reconnecting. */
export async function getClientId(): Promise<string> {
  // Browser tabs share localStorage, so a host tab and a guest tab would collide;
  // sessionStorage is per-tab yet survives reloads.
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    const existing = sessionStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const clientId = createId();
    sessionStorage.setItem(CLIENT_ID_KEY, clientId);
    return clientId;
  }

  const existing = await AsyncStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;

  const clientId = createId();
  await AsyncStorage.setItem(CLIENT_ID_KEY, clientId);
  return clientId;
}
