/**
 * PARTY LED Server Configuration
 *
 * Update SERVER_URL to match your server's network address.
 * When running the server locally, use your machine's LAN IP.
 *
 * To find your IP:
 *   Windows:  ipconfig → look for IPv4 Address
 *   Mac/Linux: ifconfig or ip addr
 */

import { Platform } from 'react-native';

/**
 * Production: set EXPO_PUBLIC_SERVER_URL=https://your-domain.example.
 * Local web runs automatically use their own origin; native development can
 * set EXPO_PUBLIC_SERVER_URL=http://192.168.x.x:3001.
 */
function configuredServerUrl(): string {
  const configured = process.env.EXPO_PUBLIC_SERVER_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { protocol, hostname, port, origin } = window.location;
    // The Expo dev server (8081) doesn't host the WebSocket server.
    return port === '8081' ? `${protocol}//${hostname}:3001` : origin;
  }

  // No private address is embedded in release builds. This URL makes setup
  // errors obvious instead of silently producing an unusable QR code.
  return 'https://YOUR_DOMAIN.example';
}

export const SERVER_URL = configuredServerUrl();
export const APP_SCHEME = 'digitalsignboard';

export function getWebSocketUrl(httpUrl: string = SERVER_URL): string {
  const url = new URL(httpUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString().replace(/\/$/, '');
}

/** QR codes always carry a browser-capable HTTPS URL. */
export function buildJoinUrl(roomCode: string, serverUrl: string = SERVER_URL): string {
  const url = new URL(serverUrl);
  if (url.protocol !== 'https:' && !url.hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
    throw new Error('QR sharing requires an HTTPS public server URL.');
  }
  url.pathname = '/join';
  url.search = `?code=${encodeURIComponent(roomCode)}`;
  return url.toString();
}
