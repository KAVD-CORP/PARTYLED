import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { ContentControls, Section } from '../components/content-controls';
import { Stage } from '../components/stage';
import { UI } from '../constants/party';
import { useServerNow } from '../hooks/use-server-now';
import { DEFAULT_ROOM_STATE, RoomState } from '../types/session';

const STORAGE_KEY = 'partyled-solo-design';

function KeepAwake() {
  useKeepAwake();
  return null;
}

export default function SoloScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [state, setState] = useState<RoomState>({ ...DEFAULT_ROOM_STATE, text: 'HELLO' });
  const [fullscreen, setFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const startedAt = useRef(Date.now());
  const now = useServerNow(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setState((prev) => ({ ...prev, ...JSON.parse(saved) }));
    });
  }, []);

  const update = (partial: Partial<RoomState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const enter = async () => {
    startedAt.current = Date.now();
    setShowHint(true);
    setTimeout(() => setShowHint(false), 2500);
    setFullscreen(true);
    if (Platform.OS === 'web') document.documentElement.requestFullscreen?.().catch(() => {});
    else await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  };

  const exit = async () => {
    setFullscreen(false);
    if (Platform.OS === 'web') {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
  };

  const live: RoomState = { ...state, isPlaying: true, blackout: false, startAt: startedAt.current };

  if (fullscreen) {
    return (
      <Pressable style={styles.full} onPress={exit}>
        <StatusBar hidden />
        <KeepAwake />
        <Stage state={live} now={now} width={width} height={height} />
        {showHint && (
          <View style={styles.hint}>
            <Text style={styles.hintTxt}>Tap anywhere to exit</Text>
          </View>
        )}
      </Pressable>
    );
  }

  const previewW = Math.min(width - 36, 560);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/signboard'))} style={styles.back}>
          <Text style={styles.backTxt}>‹ Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SOLO</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Section title="PREVIEW">
          <View style={[styles.preview, { width: previewW, height: previewW * 0.5 }]}>
            <Stage state={live} now={now} width={previewW} height={previewW * 0.5} />
          </View>
          <Text style={styles.note}>Only this phone. No internet or room needed.</Text>
        </Section>
        <ContentControls state={state} onChange={update} accent={UI.green} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.playBtn} onPress={enter}>
          <Text style={styles.playTxt}>Go fullscreen</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.bg },
  full: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  back: { paddingVertical: 6, width: 60 },
  backTxt: { color: UI.muted, fontWeight: '800', fontSize: 15 },
  headerTitle: { color: UI.text, fontWeight: '900', letterSpacing: 3 },
  content: { padding: 18, paddingBottom: 120, gap: 22, maxWidth: 640, width: '100%', alignSelf: 'center' },
  preview: { alignSelf: 'center', borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' },
  note: { color: UI.faint, fontSize: 12, textAlign: 'center' },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, paddingBottom: 22, backgroundColor: 'rgba(7,7,12,0.96)', borderTopWidth: 1, borderTopColor: UI.cardBorder },
  playBtn: { backgroundColor: UI.green, borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  playTxt: { color: '#000', fontWeight: '900', fontSize: 16 },
  hint: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  hintTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
