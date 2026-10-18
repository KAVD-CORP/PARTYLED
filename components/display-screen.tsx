import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Stage } from './stage';
import { UI } from '../constants/party';
import { useServerNow } from '../hooks/use-server-now';
import { startClockSync } from '../services/clock';
import { socket } from '../services/websocket';
import { ConnectionStatus, DEFAULT_ROOM_STATE, RoomSnapshot, ServerMessage, SessionMode } from '../types/session';

// Survives the remount when the host switches modes, so guests only tap once.
let tappedIn = false;

interface DisplayScreenProps {
  mode: SessionMode;
}

export function DisplayScreen({ mode }: DisplayScreenProps) {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { width, height } = useWindowDimensions();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(socket.lastSnapshot);
  const [status, setStatus] = useState<ConnectionStatus>(socket.getStatus());
  const [ready, setReady] = useState(Platform.OS !== 'web' || tappedIn);
  const [hostState, setHostState] = useState<'live' | 'reconnecting' | 'ended'>('live');
  const [showOverlay, setShowOverlay] = useState(false);
  useKeepAwake();

  // A reload loses the in-memory session; route back through /join to rejoin with the same device id.
  const [needsRejoin] = useState(() => !socket.lastSnapshot && !!code);

  useEffect(() => {
    if (needsRejoin) return;
    const stopClock = startClockSync();
    const offMessage = socket.onMessage((m: ServerMessage) => {
      if (m.type === 'room_joined' || m.type === 'state_update' || m.type === 'grid_update' || m.type === 'device_count' || m.type === 'room_snapshot') {
        setSnapshot(m.snapshot);
        setHostState('live');
        if (m.snapshot.state.mode !== mode) {
          router.replace({ pathname: m.snapshot.state.mode === 'swarm-billboard' ? '/swarm-display' : '/client-display', params: { code: m.snapshot.roomCode } });
        }
      }
      if (m.type === 'host_reconnecting') setHostState('reconnecting');
      if (m.type === 'host_disconnected') {
        setHostState('ended');
        socket.disconnect();
      }
    });
    const offStatus = socket.onStatusChange(setStatus);
    return () => {
      stopClock();
      offMessage();
      offStatus();
    };
  }, [mode, router, needsRejoin]);

  const state = snapshot?.state ?? { ...DEFAULT_ROOM_STATE, mode };
  const live = ready && state.isPlaying && hostState !== 'ended';
  const now = useServerNow(live);
  const swarm = mode === 'swarm-billboard';
  const cols = swarm ? snapshot?.gridCols ?? 1 : 1;
  const rows = swarm ? snapshot?.gridRows ?? 1 : 1;
  const cell = swarm ? snapshot?.cell ?? null : 0;
  const col = cell === null ? 0 : cell % cols;
  const row = cell === null ? 0 : Math.floor(cell / cols);
  const leave = () => {
    socket.disconnect();
    router.replace('/signboard');
  };

  if (needsRejoin) {
    return <Redirect href={{ pathname: '/join', params: { code } }} />;
  }

  if (!ready) {
    return (
      <Pressable
        style={styles.center}
        onPress={() => {
          tappedIn = true;
          setReady(true);
          document.documentElement.requestFullscreen?.().catch(() => {});
        }}
      >
        <StatusBar style="light" />
        <View style={[styles.orb, { borderColor: swarm ? UI.pink : UI.cyan }]} />
        <Text style={styles.big}>Tap to join the show</Text>
        <Text style={styles.sub}>Goes fullscreen and keeps your screen awake.</Text>
      </Pressable>
    );
  }

  if (hostState === 'ended') {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <Text style={styles.big}>Show’s over</Text>
        <Text style={styles.sub}>The host ended this session.</Text>
        <TouchableOpacity style={styles.primary} onPress={leave}><Text style={styles.primaryTxt}>Done</Text></TouchableOpacity>
      </View>
    );
  }

  if (live && cell !== null) {
    return (
      <Pressable style={styles.full} onPress={() => setShowOverlay((v) => !v)}>
        <StatusBar hidden />
        <Stage state={state} now={now} width={width} height={height} cols={cols} rows={rows} col={col} row={row} />
        {(showOverlay || status !== 'connected' || hostState === 'reconnecting') && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTxt}>
              {status !== 'connected' ? 'Reconnecting…' : hostState === 'reconnecting' ? 'Host reconnecting…' : swarm ? `Row ${row + 1} · Seat ${col + 1}` : `Room ${snapshot?.roomCode}`}
            </Text>
            {showOverlay && <TouchableOpacity onPress={leave}><Text style={styles.leave}>Leave</Text></TouchableOpacity>}
          </View>
        )}
      </Pressable>
    );
  }

  const taken = new Set(snapshot?.cells.map((c) => c.cell));
  return (
    <View style={styles.center}>
      <StatusBar style="light" />
      <View style={[styles.statusPill, { borderColor: status === 'connected' ? UI.green : UI.danger }]}>
        <Text style={styles.statusTxt}>
          {status !== 'connected' ? 'Reconnecting…' : hostState === 'reconnecting' ? 'Host reconnecting…' : `Connected · Room ${snapshot?.roomCode ?? ''}`}
        </Text>
      </View>

      {swarm ? (
        cell === null ? (
          <>
            <Text style={styles.big}>The grid is full</Text>
            <Text style={styles.sub}>Hang tight — the host can add more rows or seats.</Text>
          </>
        ) : (
          <>
            <Text style={styles.kicker}>YOUR SPOT</Text>
            <Text style={styles.cellLabel}>Row {row + 1} · Seat {col + 1}</Text>
            <Text style={styles.sub}>Row 1 is closest to the stage; seat 1 is on the left. Stand in your spot and hold your phone up when the show starts.</Text>
            <View style={styles.grid}>
              {Array.from({ length: rows }).map((_, r) => (
                <View key={r} style={styles.gridRow}>
                  {Array.from({ length: cols }).map((__, c) => {
                    const index = r * cols + c;
                    const mine = index === cell;
                    const busy = taken.has(index) && !mine;
                    return (
                      <TouchableOpacity
                        key={c}
                        disabled={busy || mine}
                        onPress={() => socket.requestCell(index)}
                        style={[styles.gridCell, busy && styles.gridBusy, mine && styles.gridMine]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
            <Text style={styles.hint}>Wrong spot? Tap an empty cell to move.</Text>
          </>
        )
      ) : (
        <>
          <View style={[styles.orb, { borderColor: UI.cyan }]} />
          <Text style={styles.big}>You’re in</Text>
          <Text style={styles.sub}>Keep this screen open. It lights up when the host starts the show.</Text>
        </>
      )}

      <TouchableOpacity onPress={leave} style={styles.secondary}><Text style={styles.secondaryTxt}>Leave</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: UI.bg, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  orb: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, marginBottom: 12 },
  kicker: { color: UI.pink, fontWeight: '900', letterSpacing: 3, fontSize: 12 },
  big: { color: UI.text, fontSize: 30, fontWeight: '900', textAlign: 'center' },
  cellLabel: { color: UI.text, fontSize: 40, fontWeight: '900', textAlign: 'center' },
  sub: { color: UI.muted, fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 340 },
  hint: { color: UI.faint, fontSize: 12 },
  statusPill: { position: 'absolute', top: 54, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  statusTxt: { color: UI.text, fontSize: 12, fontWeight: '700' },
  grid: { gap: 6, marginTop: 10, width: '100%', maxWidth: 300 },
  gridRow: { flexDirection: 'row', gap: 6 },
  gridCell: { flex: 1, aspectRatio: 1.3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  gridBusy: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'transparent' },
  gridMine: { backgroundColor: UI.pink, borderColor: UI.pink },
  overlay: { position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  overlayTxt: { color: UI.text, fontWeight: '800' },
  leave: { color: UI.danger, fontWeight: '800' },
  primary: { backgroundColor: UI.cyan, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginTop: 10 },
  primaryTxt: { color: '#000', fontWeight: '900' },
  secondary: { position: 'absolute', bottom: 40 },
  secondaryTxt: { color: UI.muted, fontWeight: '700' },
});
