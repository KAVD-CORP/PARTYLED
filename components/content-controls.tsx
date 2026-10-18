import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ColorField } from './color-field';
import { UI } from '../constants/party';
import { DISPLAY_EFFECTS, RoomState } from '../types/session';

interface ContentControlsProps {
  state: RoomState;
  onChange: (partial: Partial<RoomState>) => void;
  accent: string;
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Stepper({ label, value, display, step, min, max, onChange }: { label: string; value: number; display: string; step: number; min: number; max: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.round(Math.max(min, Math.min(max, v)) * 100) / 100);
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepRow}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => set(value - step)}><Text style={styles.stepTxt}>−</Text></TouchableOpacity>
        <Text style={styles.stepValue}>{display}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={() => set(value + step)}><Text style={styles.stepTxt}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
}

export function ContentControls({ state, onChange, accent }: ContentControlsProps) {
  const usesTextColor = state.contentType === 'text' && state.effect !== 'rainbow';

  return (
    <>
      <Section title="CONTENT">
        <View style={styles.segment}>
          {(['text', 'image'] as const).map((t) => (
            <TouchableOpacity key={t} onPress={() => onChange({ contentType: t })} style={[styles.segBtn, state.contentType === t && { backgroundColor: accent }]}>
              <Text style={[styles.segTxt, state.contentType === t && { color: '#000' }]}>{t === 'text' ? 'Text' : 'Image URL'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {state.contentType === 'text' ? (
          <TextInput value={state.text} onChangeText={(text) => onChange({ text })} placeholder="Your message" placeholderTextColor={UI.faint} style={styles.input} maxLength={500} />
        ) : (
          <TextInput value={state.imageUrl} onChangeText={(imageUrl) => onChange({ imageUrl })} placeholder="https://…/image.png" placeholderTextColor={UI.faint} style={styles.input} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        )}
      </Section>

      <Section title="EFFECT">
        <View style={styles.chips}>
          {DISPLAY_EFFECTS.map((e) => (
            <TouchableOpacity key={e.id} onPress={() => onChange({ effect: e.id })} style={[styles.chip, state.effect === e.id && { backgroundColor: accent, borderColor: accent }]}>
              <Text style={[styles.chipTxt, state.effect === e.id && { color: '#000' }]}>{e.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      <Section title="STYLE">
        {state.effect !== 'chase' && (
          <>
            <Text style={styles.fieldLabel}>Background</Text>
            <ColorField value={state.bgColor} onChange={(bgColor) => onChange({ bgColor })} />
          </>
        )}
        {usesTextColor && (
          <>
            <Text style={styles.fieldLabel}>Text color</Text>
            <ColorField value={state.textColor} onChange={(textColor) => onChange({ textColor })} />
          </>
        )}
        <View style={styles.steppers}>
          <Stepper label="SIZE" value={state.textSize} display={`${state.textSize}`} step={10} min={20} max={300} onChange={(textSize) => onChange({ textSize })} />
          <Stepper label="SPEED" value={state.speed} display={`${state.speed}`} step={25} min={25} max={1000} onChange={(speed) => onChange({ speed })} />
          <Stepper label="BRIGHT" value={state.brightness} display={`${Math.round(state.brightness * 100)}%`} step={0.1} min={0.1} max={1} onChange={(brightness) => onChange({ brightness })} />
        </View>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionTitle: { color: UI.muted, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  segment: { flexDirection: 'row', backgroundColor: UI.card, borderRadius: 12, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segTxt: { color: UI.muted, fontWeight: '800' },
  input: { backgroundColor: UI.card, color: UI.text, fontSize: 18, fontWeight: '700', borderRadius: 12, borderWidth: 1, borderColor: UI.cardBorder, paddingHorizontal: 14, paddingVertical: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: UI.cardBorder, backgroundColor: UI.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipTxt: { color: UI.text, fontWeight: '700', fontSize: 13 },
  fieldLabel: { color: UI.text, fontWeight: '700', fontSize: 13 },
  steppers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  stepper: { flexGrow: 1, flexBasis: 120, backgroundColor: UI.card, borderRadius: 12, padding: 10, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: UI.cardBorder },
  stepLabel: { color: UI.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: UI.raised, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { color: UI.text, fontSize: 17, fontWeight: '800' },
  stepValue: { color: UI.text, fontWeight: '900', minWidth: 38, textAlign: 'center' },
});
