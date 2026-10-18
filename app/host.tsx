import { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { QRCodeDisplay } from '../components/qr-code-display';
import { ModeSelector } from '../components/mode-selector';
import { SwarmGridConfig } from '../components/swarm-grid-config';
import { Stage } from '../components/stage';
import { ContentControls, Section } from '../components/content-controls';
import { UI } from '../constants/party';
import { useServerNow } from '../hooks/use-server-now';
import { startClockSync } from '../services/clock';
import { getClientId } from '../services/identity';
import { socket } from '../services/websocket';
import { ConnectionStatus, DEFAULT_ROOM_STATE, RoomSnapshot, RoomState, ServerMessage, SessionMode } from '../types/session';

export default function HostScreen() {
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [joinUrl, setJoinUrl] = useState('');
  const [state, setState] = useState<RoomState>(DEFAULT_ROOM_STATE);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState('');
  const hostToken = useRef('');
  const clientIdRef = useRef('');
  const previewStart = useRef(Date.now());
  const now = useServerNow(true);

  useEffect(() => {
    let active = true;
    const stopClock = startClockSync();
    getClientId().then((clientId) => {
      if (!active) return;
      clientIdRef.current = clientId;
      socket.connect();
      socket.createRoom('display-control', clientId, 3, 2);
    });
    const offMessage = socket.onMessage((m: ServerMessage) => {
      if (m.type === 'room_created') {
        hostToken.current = m.hostToken;
        socket.rememberSession(m.snapshot.roomCode, clientIdRef.current, m.hostToken);
        setJoinUrl(m.joinUrl);
        setSnapshot(m.snapshot);
        setState(m.snapshot.state);
      } else if (m.type === 'state_update') {
        setSnapshot(m.snapshot);
        // Keep local text edits authoritative so fast typing isn't overwritten by older echoes.
        setState((prev) => ({ ...prev, isPlaying: m.snapshot.state.isPlaying, startAt: m.snapshot.state.startAt }));
      } else if (m.type === 'grid_update' || m.type === 'device_count' || m.type === 'room_joined') {
        setSnapshot(m.snapshot);
      } else if (m.type === 'error') {
        setError(m.message);
      }
    });
    const offStatus = socket.onStatusChange(setStatus);
    return () => {
      active = false;
      stopClock();
      offMessage();
      offStatus();
    };
  }, []);

  const update = (partial: Partial<RoomState>) => {
    setState((prev) => ({ ...prev, ...partial }));
    setError('');
    if (hostToken.current) socket.updateState(partial, hostToken.current);
  };
  const setMode = (mode: SessionMode) => update({ mode });
  const setGrid = (cols: number, rows: number) => hostToken.current && socket.setGrid(cols, rows, hostToken.current);
  const moveCell = (clientId: string, cell: number) => hostToken.current && socket.assignCell(clientId, cell, hostToken.current);
  const leave = () => {
    socket.disconnect();
    if (router.canGoBack()) router.back();
    else router.replace('/signboard');
  };

  const cols = state.mode === 'swarm-billboard' ? snapshot?.gridCols ?? 3 : 1;
  const rows = state.mode === 'swarm-billboard' ? snapshot?.gridRows ?? 2 : 1;
  const previewW = Math.min(screenW - 36, 560);
  const tileW = previewW / cols;
  const tileH = state.mode === 'swarm-billboard' ? tileW * 0.6 : previewW * 0.5;
  const previewState: RoomState = { ...state, isPlaying: true, blackout: state.blackout, startAt: state.startAt ?? previewStart.current };
  const connected = status === 'connected';
  const swarm = state.mode === 'swarm-billboard';
  const accent = swarm ? UI.pink : UI.cyan;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={leave} style={styles.back}><Text style={styles.backTxt}>‹ End</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>HOST</Text>
        <View style={[styles.pill, { borderColor: connected ? UI.green : UI.danger }]}>
          <View style={[styles.pillDot, { backgroundColor: connected ? UI.green : UI.danger }]} />
          <Text style={styles.pillTxt}>{connected ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <QRCodeDisplay roomCode={snapshot?.roomCode ?? ''} joinUrl={joinUrl} deviceCount={snapshot?.deviceCount ?? 0} />
        {!connected && !snapshot && (
          <Text style={styles.error}>Can’t reach the server. Start it with “npm start” inside server/, or check EXPO_PUBLIC_SERVER_URL.</Text>
        )}

        <Section title="MODE">
          <ModeSelector mode={state.mode} onSelectMode={setMode} />
        </Section>

        {swarm && snapshot && (
          <SwarmGridConfig cols={snapshot.gridCols} rows={snapshot.gridRows} cells={snapshot.cells} onUpdateGrid={setGrid} onMove={moveCell} />
        )}

        <Section title="LIVE PREVIEW">
          <View style={[styles.preview, { width: previewW }]}>
            {Array.from({ length: rows }).map((_, r) => (
              <View key={r} style={{ flexDirection: 'row' }}>
                {Array.from({ length: cols }).map((__, c) => (
                  <View key={c} style={[styles.tile, { width: tileW, height: tileH }, swarm && styles.tileBorder]}>
                    <Stage state={previewState} now={now} width={tileW} height={tileH} cols={cols} rows={rows} col={c} row={r} />
                  </View>
                ))}
              </View>
            ))}
          </View>
          <Text style={styles.previewNote}>{state.isPlaying ? (state.blackout ? 'Blackout — every phone is dark.' : 'Phones are showing this now.') : 'Preview only — press Start to send to phones.'}</Text>
        </Section>

        <ContentControls state={state} onChange={update} accent={accent} />

        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          disabled={!snapshot}
          onPress={() => update({ blackout: !state.blackout })}
          style={[styles.blackoutBtn, state.blackout && { backgroundColor: UI.text }]}
        >
          <Text style={[styles.blackoutTxt, state.blackout && { color: '#000' }]}>{state.blackout ? 'Lights on' : 'Blackout'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!snapshot}
          onPress={() => update({ isPlaying: !state.isPlaying, blackout: false })}
          style={[styles.playBtn, { backgroundColor: state.isPlaying ? UI.danger : accent }, !snapshot && { opacity: 0.4 }]}
        >
          <Text style={styles.playTxt}>{state.isPlaying ? 'Stop show' : `Start on ${snapshot?.deviceCount ?? 0} phone${snapshot?.deviceCount === 1 ? '' : 's'}`}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  back: { paddingVertical: 6, paddingRight: 12 },
  backTxt: { color: UI.muted, fontWeight: '800', fontSize: 15 },
  headerTitle: { color: UI.text, fontWeight: '900', letterSpacing: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillTxt: { color: UI.text, fontSize: 12, fontWeight: '700' },
  content: { padding: 18, paddingBottom: 120, gap: 22, maxWidth: 640, width: '100%', alignSelf: 'center' },
  section: { gap: 10 },
  sectionTitle: { color: UI.muted, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  preview: { alignSelf: 'center', borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' },
  tile: { overflow: 'hidden' },
  tileBorder: { borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.25)' },
  previewNote: { color: UI.faint, fontSize: 12, textAlign: 'center' },
  segment: { flexDirection: 'row', backgroundColor: UI.card, borderRadius: 12, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segTxt: { color: UI.muted, fontWeight: '800' },
  input: { backgroundColor: UI.card, color: UI.text, fontSize: 18, fontWeight: '700', borderRadius: 12, borderWidth: 1, borderColor: UI.cardBorder, paddingHorizontal: 14, paddingVertical: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: UI.cardBorder, backgroundColor: UI.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipTxt: { color: UI.text, fontWeight: '700', fontSize: 13 },
  fieldLabel: { color: UI.text, fontWeight: '700', fontSize: 13 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  swatchActive: { borderColor: UI.text, transform: [{ scale: 1.12 }] },
  steppers: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stepper: { flex: 1, backgroundColor: UI.card, borderRadius: 12, padding: 10, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: UI.cardBorder },
  stepLabel: { color: UI.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: UI.raised, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { color: UI.text, fontSize: 17, fontWeight: '800' },
  stepValue: { color: UI.text, fontWeight: '900', minWidth: 38, textAlign: 'center' },
  error: { color: UI.danger, textAlign: 'center', fontSize: 13 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 22, backgroundColor: 'rgba(7,7,12,0.96)', borderTopWidth: 1, borderTopColor: UI.cardBorder },
  blackoutBtn: { paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, borderColor: UI.text, justifyContent: 'center' },
  blackoutTxt: { color: UI.text, fontWeight: '800' },
  playBtn: { flex: 1, borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  playTxt: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
});
