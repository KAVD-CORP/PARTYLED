import { useState } from 'react';
import { ActivityIndicator, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { UI } from '../constants/party';

interface QRCodeDisplayProps {
  roomCode: string;
  joinUrl: string;
  deviceCount: number;
}

function linkWarning(joinUrl: string): string | null {
  try {
    const { protocol, hostname } = new URL(joinUrl);
    if (/^(localhost|127\.0\.0\.1)$/.test(hostname)) return 'This link only works on this computer. Set PUBLIC_ORIGIN on the server to your LAN IP or HTTPS domain.';
    if (hostname.includes('YOUR_DOMAIN')) return 'Placeholder domain — set PUBLIC_ORIGIN and EXPO_PUBLIC_SERVER_URL before sharing.';
    if (protocol !== 'https:') return 'Not HTTPS: works on the same Wi-Fi only. Use an HTTPS domain for concerts.';
  } catch {
    return 'Invalid join link.';
  }
  return null;
}

export function QRCodeDisplay({ roomCode, joinUrl, deviceCount }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const warning = joinUrl ? linkWarning(joinUrl) : null;

  const share = async () => {
    if (Platform.OS === 'web') {
      await navigator.clipboard?.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } else {
      await Share.share({ message: `Join my PARTY LED show: ${joinUrl}`, url: joinUrl });
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.qrFrame}>
        {joinUrl ? (
          <QRCode value={joinUrl} size={196} color="#000" backgroundColor="#fff" ecl="M" />
        ) : (
          <View style={styles.qrPlaceholder}><ActivityIndicator color={UI.cyan} /></View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.label}>ROOM CODE</Text>
        <Text style={styles.code}>{roomCode || '······'}</Text>
        <View style={styles.live}>
          <View style={[styles.dot, deviceCount === 0 && { backgroundColor: UI.faint }]} />
          <Text style={styles.liveText}>{deviceCount === 0 ? 'Waiting for phones' : `${deviceCount} phone${deviceCount === 1 ? '' : 's'} connected`}</Text>
        </View>
        <Text style={styles.hint}>Point any phone camera at the code. No app needed — it opens in the browser.</Text>
        {!!joinUrl && <Text style={styles.url} numberOfLines={1}>{joinUrl.replace(/^https?:\/\//, '')}</Text>}
        {!!warning && <Text style={styles.warning}>{warning}</Text>}
        <TouchableOpacity style={styles.shareBtn} onPress={share} disabled={!joinUrl}>
          <Text style={styles.shareText}>{copied ? 'Link copied' : Platform.OS === 'web' ? 'Copy join link' : 'Share join link'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: UI.card, borderRadius: UI.radius, borderWidth: 1, borderColor: UI.cardBorder, padding: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'center', justifyContent: 'center' },
  qrFrame: { backgroundColor: '#fff', padding: 12, borderRadius: 16 },
  qrPlaceholder: { width: 196, height: 196, alignItems: 'center', justifyContent: 'center' },
  info: { flexGrow: 1, flexBasis: 220, gap: 6 },
  label: { color: UI.muted, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  code: { color: UI.cyan, fontSize: 36, fontWeight: '900', letterSpacing: 6, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: UI.green },
  liveText: { color: UI.text, fontWeight: '700' },
  hint: { color: UI.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  url: { color: UI.faint, fontSize: 11 },
  warning: { color: '#ffb020', fontSize: 11, lineHeight: 15 },
  shareBtn: { marginTop: 6, backgroundColor: UI.raised, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  shareText: { color: UI.text, fontWeight: '800', fontSize: 13 },
});
