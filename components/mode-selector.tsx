import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UI } from '../constants/party';
import { SessionMode } from '../types/session';

interface ModeSelectorProps {
  mode: SessionMode;
  onSelectMode: (mode: SessionMode) => void;
}

const MODES: { id: SessionMode; title: string; body: string; color: string }[] = [
  { id: 'display-control', title: 'Broadcast', body: 'Every phone shows the same thing.', color: UI.cyan },
  { id: 'swarm-billboard', title: 'Swarm billboard', body: 'Phones tile into one giant screen.', color: UI.pink },
];

export function ModeSelector({ mode, onSelectMode }: ModeSelectorProps) {
  return (
    <View style={styles.row}>
      {MODES.map((m) => {
        const active = m.id === mode;
        return (
          <TouchableOpacity
            key={m.id}
            onPress={() => onSelectMode(m.id)}
            activeOpacity={0.85}
            style={[styles.card, active && { borderColor: m.color, backgroundColor: `${m.color}1f` }]}
          >
            <Text style={[styles.title, active && { color: m.color }]}>{m.title}</Text>
            <Text style={styles.body}>{m.body}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  card: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: UI.cardBorder, backgroundColor: UI.card, gap: 4 },
  title: { color: UI.text, fontWeight: '900', fontSize: 15 },
  body: { color: UI.muted, fontSize: 12, lineHeight: 16 },
});
