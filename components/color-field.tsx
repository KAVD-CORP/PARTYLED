import React, { useEffect, useId, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { SWATCHES, UI } from '../constants/party';
import { clamp, hexToHsv, hsvToHex, hueColor, normalizeHex } from '../utils/color';

const PICKER_SIZE = 248;
const HUE_H = 16;

interface ColorFieldProps {
  value: string;
  onChange: (hex: string) => void;
}

function GoogleStylePicker({
  h,
  s,
  v,
  gradId,
  onPickSv,
  onPickHue,
}: {
  h: number;
  s: number;
  v: number;
  gradId: string;
  onPickSv: (s: number, val: number) => void;
  onPickHue: (hue: number) => void;
}) {
  const pickSv = (locationX: number, locationY: number) => {
    onPickSv(clamp(locationX / PICKER_SIZE, 0, 1), clamp(1 - locationY / PICKER_SIZE, 0, 1));
  };
  const pickHue = (locationX: number) => {
    onPickHue(clamp(locationX / PICKER_SIZE, 0, 1) * 360);
  };

  return (
    <View style={styles.pickerStack}>
      <View
        style={styles.svPlane}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => pickSv(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        onResponderMove={(e) => pickSv(e.nativeEvent.locationX, e.nativeEvent.locationY)}
      >
        <Svg width={PICKER_SIZE} height={PICKER_SIZE}>
          <Defs>
            <LinearGradient id={`${gradId}-sat`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#ffffff" />
              <Stop offset="100%" stopColor={hueColor(h)} />
            </LinearGradient>
            <LinearGradient id={`${gradId}-val`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#000000" stopOpacity="0" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id={`${gradId}-hue`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#ff0000" />
              <Stop offset="17%" stopColor="#ffff00" />
              <Stop offset="33%" stopColor="#00ff00" />
              <Stop offset="50%" stopColor="#00ffff" />
              <Stop offset="67%" stopColor="#0000ff" />
              <Stop offset="83%" stopColor="#ff00ff" />
              <Stop offset="100%" stopColor="#ff0000" />
            </LinearGradient>
          </Defs>
          <Rect width={PICKER_SIZE} height={PICKER_SIZE} fill={`url(#${gradId}-sat)`} />
          <Rect width={PICKER_SIZE} height={PICKER_SIZE} fill={`url(#${gradId}-val)`} />
        </Svg>
        <View
          pointerEvents="none"
          style={[
            styles.svKnob,
            {
              left: s * PICKER_SIZE - 9,
              top: (1 - v) * PICKER_SIZE - 9,
              borderColor: v > 0.6 ? '#000000' : '#ffffff',
            },
          ]}
        />
      </View>

      <View
        style={styles.hueBar}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => pickHue(e.nativeEvent.locationX)}
        onResponderMove={(e) => pickHue(e.nativeEvent.locationX)}
      >
        <Svg width={PICKER_SIZE} height={HUE_H}>
          <Rect width={PICKER_SIZE} height={HUE_H} fill={`url(#${gradId}-hue)`} rx={8} />
        </Svg>
        <View pointerEvents="none" style={[styles.hueKnob, { left: (h / 360) * PICKER_SIZE - 7 }]} />
      </View>
    </View>
  );
}

export function ColorField({ value, onChange }: ColorFieldProps) {
  const gradId = useId().replace(/:/g, '');
  const normalized = normalizeHex(value) ?? '#ffffff';
  const isPreset = SWATCHES.includes(normalized);
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(normalized));
  const [hexDraft, setHexDraft] = useState(normalized);

  useEffect(() => {
    const n = normalizeHex(value) ?? '#ffffff';
    setHexDraft(n);
    setHsv(hexToHsv(n));
  }, [value]);

  const openPicker = () => {
    setHsv(hexToHsv(normalized));
    setHexDraft(normalized);
    setOpen(true);
  };

  const applyHsv = (next: { h: number; s: number; v: number }) => {
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    setHexDraft(hex);
    onChange(hex);
  };

  const applyHex = (raw: string) => {
    const n = normalizeHex(raw);
    if (!n) return;
    setHexDraft(n);
    setHsv(hexToHsv(n));
    onChange(n);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.swatches}>
        {SWATCHES.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => onChange(c)}
            style={[styles.swatch, { backgroundColor: c }, normalized === c && styles.swatchActive]}
          />
        ))}
      </View>

      <TouchableOpacity
        onPress={openPicker}
        style={[styles.customBtn, !isPreset && styles.customBtnActive]}
        accessibilityRole="button"
        accessibilityLabel="Pick custom color"
      >
        <View style={[styles.customChip, { backgroundColor: normalized }]} />
        <Text style={styles.customBtnTxt}>Pick custom color</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close color picker" />
          <View style={styles.popover}>
            <GoogleStylePicker
              gradId={gradId}
              h={hsv.h}
              s={hsv.s}
              v={hsv.v}
              onPickSv={(s, val) => applyHsv({ ...hsv, s, v: val })}
              onPickHue={(hue) => applyHsv({ ...hsv, h: hue })}
            />
            <View style={styles.hexRow}>
              <View style={[styles.customChip, styles.hexPreview, { backgroundColor: normalized }]} />
              <TextInput
                value={hexDraft}
                onChangeText={(t) => setHexDraft(t.startsWith('#') ? t : `#${t}`)}
                onBlur={() => applyHex(hexDraft)}
                onSubmitEditing={() => applyHex(hexDraft)}
                style={styles.hexInput}
                placeholder="#ffffff"
                placeholderTextColor={UI.faint}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={7}
              />
            </View>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.doneBtn}>
              <Text style={styles.doneBtnTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  swatchActive: { borderColor: UI.text, transform: [{ scale: 1.12 }] },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    backgroundColor: UI.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  customBtnActive: { borderColor: UI.text },
  customChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  customBtnTxt: { color: UI.text, fontWeight: '700', fontSize: 14 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    ...Platform.select({
      web: { zIndex: 100000 },
      default: {},
    }),
  },
  popover: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.cardBorder,
    padding: 16,
    gap: 14,
    maxWidth: PICKER_SIZE + 32,
    width: '100%',
    ...Platform.select({
      web: { boxShadow: '0 12px 40px rgba(0,0,0,0.45)' as unknown as undefined },
      default: {},
    }),
  },
  pickerStack: { alignSelf: 'center', gap: 12 },
  svPlane: { width: PICKER_SIZE, height: PICKER_SIZE, borderRadius: 4, overflow: 'hidden' },
  svKnob: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  hueBar: { width: PICKER_SIZE, height: HUE_H, borderRadius: 8, overflow: 'hidden' },
  hueKnob: {
    position: 'absolute',
    top: -2,
    width: 14,
    height: HUE_H + 4,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hexPreview: { width: 28, height: 28, borderRadius: 6 },
  hexInput: {
    flex: 1,
    backgroundColor: UI.raised,
    color: UI.text,
    fontSize: 15,
    fontWeight: '700',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  doneBtn: { alignSelf: 'stretch', backgroundColor: UI.cyan, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  doneBtnTxt: { color: '#000', fontWeight: '900', fontSize: 15 },
});
