import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UI } from '../constants/party';
import { getClientId } from '../services/identity';
import { socket } from '../services/websocket';
import { ServerMessage } from '../types/session';

export default function JoinScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [value, setValue] = useState(code?.toUpperCase() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const join = async (roomCode = value) => {
    const trimmed = roomCode.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Room codes are 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    socket.connect();
    socket.joinRoom(trimmed, await getClientId());
  };

  useEffect(() => {
    const off = socket.onMessage((message: ServerMessage) => {
      if (message.type === 'room_joined') {
        setLoading(false);
        const pathname = message.snapshot.state.mode === 'swarm-billboard' ? '/swarm-display' : '/client-display';
        router.replace({ pathname, params: { code: message.snapshot.roomCode } });
      }
      if (message.type === 'error') {
        setError(message.code === 'ROOM_NOT_FOUND' ? 'That room doesn’t exist or has ended.' : message.message);
        setLoading(false);
        socket.forgetSession();
      }
    });
    // Scanning the QR opens /join?code=…, so join immediately once.
    if (code?.length === 6) join(code);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      {Platform.OS === 'web' && (
        <View style={styles.banner}>
          <Text style={styles.bannerTxt}>No install needed. Want it smoother? Get the PARTY LED app.</Text>
        </View>
      )}
      <TouchableOpacity style={styles.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/signboard'))}>
        <Text style={styles.backTxt}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.body}>
        <Text style={styles.kicker}>PARTY LED</Text>
        <Text style={styles.title}>{loading ? 'Joining the show…' : 'Join the show'}</Text>
        <Text style={styles.sub}>Your screen becomes part of the light show. The host controls what it displays.</Text>

        <TextInput
          value={value}
          onChangeText={(text) => { setValue(text.toUpperCase().replace(/[^A-Z0-9]/g, '')); setError(''); }}
          onSubmitEditing={() => join()}
          maxLength={6}
          style={[styles.input, !!error && { borderColor: UI.danger }]}
          placeholder="ROOM CODE"
          placeholderTextColor={UI.faint}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!loading}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={[styles.button, (loading || value.length !== 6) && { opacity: 0.5 }]} onPress={() => join()} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Join</Text>}
        </TouchableOpacity>

        <Text style={styles.tip}>Tip: turn your brightness all the way up and keep this tab open.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.bg },
  banner: { backgroundColor: UI.raised, paddingVertical: 10, paddingHorizontal: 16 },
  bannerTxt: { color: UI.muted, fontSize: 12, textAlign: 'center' },
  back: { padding: 18 },
  backTxt: { color: UI.muted, fontWeight: '800', fontSize: 15 },
  body: { flex: 1, justifyContent: 'center', padding: 24, gap: 14, maxWidth: 440, width: '100%', alignSelf: 'center', marginTop: -60 },
  kicker: { color: UI.cyan, fontWeight: '900', letterSpacing: 4, fontSize: 12 },
  title: { color: UI.text, fontSize: 34, fontWeight: '900' },
  sub: { color: UI.muted, fontSize: 15, lineHeight: 21, marginBottom: 10 },
  input: { color: UI.text, fontSize: 30, letterSpacing: 8, fontWeight: '900', textAlign: 'center', backgroundColor: UI.card, borderWidth: 1.5, borderColor: UI.cardBorder, borderRadius: 16, paddingVertical: 16 },
  error: { color: UI.danger, fontWeight: '700' },
  button: { backgroundColor: UI.cyan, paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: '900', fontSize: 17 },
  tip: { color: UI.faint, fontSize: 12, textAlign: 'center', marginTop: 6 },
});
