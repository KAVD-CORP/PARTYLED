import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
import { UI } from '../constants/party';

const MODES: { href: Href; title: string; body: string; color: string; tag: string }[] = [
  { href: '/solo', title: 'Solo sign', body: 'Turn just this phone into a scrolling LED sign. Works offline.', color: UI.green, tag: 'ONLY YOU' },
  { href: '/host', title: 'Host a show', body: 'Show a QR code. Every phone that scans it displays what you choose — or becomes one tile of a giant billboard.', color: UI.cyan, tag: 'YOU CONTROL' },
  { href: '/join', title: 'Join a show', body: 'Enter a room code, or just scan the host’s QR with your camera.', color: UI.pink, tag: 'GUEST' },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>PARTY LED</Text>
        <Text style={styles.tagline}>Light up the crowd.</Text>

        {MODES.map((m) => (
          <TouchableOpacity key={m.title} activeOpacity={0.85} onPress={() => router.push(m.href)} style={[styles.card, { borderColor: `${m.color}55` }]}>
            <View style={styles.cardTop}>
              <Text style={[styles.cardTitle, { color: m.color }]}>{m.title}</Text>
              <Text style={[styles.tag, { color: m.color, borderColor: `${m.color}66` }]}>{m.tag}</Text>
            </View>
            <Text style={styles.cardBody}>{m.body}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.bg },
  content: { padding: 22, paddingTop: 60, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  logo: { color: UI.text, fontSize: 44, fontWeight: '900', letterSpacing: 4, textShadowColor: UI.cyan, textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  tagline: { color: UI.muted, fontSize: 16, marginBottom: 18 },
  card: { backgroundColor: UI.card, borderRadius: UI.radius, borderWidth: 1.5, padding: 20, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 22, fontWeight: '900' },
  tag: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  cardBody: { color: UI.muted, fontSize: 14, lineHeight: 20 },
});
