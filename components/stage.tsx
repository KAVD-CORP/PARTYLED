import { Image, StyleSheet, Text, View } from 'react-native';
import { GLYPH_ADVANCE, GLYPH_HEIGHT, glyphColumns } from '../constants/pixel-font';
import { DisplayEffect, RoomState } from '../types/session';

interface StageProps {
  state: RoomState;
  /** Synchronized server time in ms. */
  now: number;
  width: number;
  height: number;
  cols?: number;
  rows?: number;
  col?: number;
  row?: number;
}

const SCROLLING: DisplayEffect[] = ['marquee', 'pixel', 'rainbow'];

/** Deterministic pseudo-random in [0, 1) so every phone glitches identically. */
function noise(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Renders one viewport of the shared virtual canvas. A broadcast phone is a
 * 1×1 grid; a swarm phone shows only its (col, row) slice. Everything derives
 * from `now - state.startAt`, so every phone computes the same frame.
 */
export function Stage({ state, now, width, height, cols = 1, rows = 1, col = 0, row = 0 }: StageProps) {
  if (state.blackout || !state.isPlaying) {
    return <View style={[styles.fill, { backgroundColor: '#000' }]} />;
  }

  const { effect, speed } = state;
  const canvasW = width * cols;
  const canvasH = height * rows;
  const phase = state.startAt ? Math.max(0, now - state.startAt) / 1000 : 0;
  const scale = canvasH / 400;
  const fontSize = Math.max(12, state.textSize * scale * 1.4);
  const rate = speed / 40;

  const pixel = effect === 'pixel';
  const dot = Math.max(2, (fontSize * 1.1) / GLYPH_HEIGHT);
  const textW = pixel ? state.text.length * GLYPH_ADVANCE * dot : state.text.length * fontSize * 0.62 + fontSize;
  const textH = pixel ? GLYPH_HEIGHT * dot : fontSize * 1.15;

  let x = (canvasW - textW) / 2;
  if (SCROLLING.includes(effect)) {
    const travel = canvasW + textW;
    x = canvasW - ((phase * speed * scale) % travel);
  }
  let y = (canvasH - textH) / 2;

  let color = state.textColor;
  let opacity = 1;
  let textScale = 1;
  let glitchShift = 0;
  const index = row * cols + col;
  const total = cols * rows;

  if (effect === 'rainbow') color = `hsl(${(phase * speed) % 360}, 100%, 60%)`;
  if (effect === 'pulse') {
    const beat = 0.5 + 0.5 * Math.sin(phase * rate * 1.5);
    textScale = 0.8 + 0.25 * beat;
    opacity = 0.55 + 0.45 * beat;
  }
  if (effect === 'neon') {
    const tick = Math.floor(phase * 12);
    opacity = noise(tick) < 0.08 ? 0.25 : 1;
  }
  if (effect === 'glitch') {
    const tick = Math.floor(phase * rate * 3);
    if (noise(tick) < 0.35) {
      glitchShift = (noise(tick + 0.5) - 0.5) * fontSize * 0.5;
      y += (noise(tick + 0.7) - 0.5) * fontSize * 0.3;
    }
  }

  const strobeOff = effect === 'strobe' && Math.floor(phase * rate) % 2 === 1;
  const waveLevel = effect === 'wave' ? 0.5 + 0.5 * Math.sin(phase * rate - col * 0.9 - row * 0.5) : 0;
  const chaseHue = (phase * speed + (index * 360) / total) % 360;
  const background = effect === 'chase' ? `hsl(${chaseHue}, 100%, 50%)` : state.bgColor;

  const textStyle = { fontSize, lineHeight: fontSize * 1.15, width: textW, left: x, top: y };
  const renderText = (c: string, dx = 0, alpha = 1) => (
    <Text
      numberOfLines={1}
      style={[
        styles.text,
        textStyle,
        { color: c, left: x + dx, opacity: alpha * opacity, transform: [{ scale: textScale }] },
        effect === 'neon' && { textShadowColor: c, textShadowRadius: fontSize * 0.35, textShadowOffset: { width: 0, height: 0 } },
      ]}
    >
      {state.text}
    </Text>
  );

  const renderPixels = () => {
    // Only draw dots inside this tile; a long scrolling message would otherwise be thousands of views.
    const viewLeft = col * width - dot;
    const viewRight = (col + 1) * width;
    const viewTop = row * height - dot;
    const viewBottom = (row + 1) * height;
    const dots: React.ReactElement[] = [];
    [...state.text].forEach((char, ci) => {
      glyphColumns(char).forEach((bits, gx) => {
        const dx = x + (ci * GLYPH_ADVANCE + gx) * dot;
        if (dx < viewLeft || dx > viewRight) return;
        for (let gy = 0; gy < GLYPH_HEIGHT; gy += 1) {
          if (!(bits & (1 << gy))) continue;
          const dy = y + gy * dot;
          if (dy < viewTop || dy > viewBottom) continue;
          dots.push(
            <View
              key={`${ci}-${gx}-${gy}`}
              style={[styles.dot, { left: dx, top: dy, width: dot * 0.82, height: dot * 0.82, borderRadius: dot * 0.41, backgroundColor: color }]}
            />,
          );
        }
      });
    });
    return dots;
  };

  return (
    <View style={[styles.fill, { backgroundColor: '#000' }]}>
      <View style={[styles.fill, { opacity: state.brightness }]}>
        <View style={[styles.fill, { backgroundColor: background }]} />
        {!strobeOff && (
          <View style={[styles.canvas, { width: canvasW, height: canvasH, left: -col * width, top: -row * height }]}>
            {state.contentType === 'image' && state.imageUrl ? (
              <Image source={{ uri: state.imageUrl }} style={{ width: canvasW, height: canvasH, opacity }} resizeMode="cover" />
            ) : pixel ? (
              renderPixels()
            ) : effect === 'glitch' && glitchShift !== 0 ? (
              <>
                {renderText('#ff0044', -glitchShift, 0.8)}
                {renderText('#00e5ff', glitchShift, 0.8)}
                {renderText(color)}
              </>
            ) : (
              renderText(color)
            )}
          </View>
        )}
        {effect === 'wave' && <View style={[styles.fill, { backgroundColor: '#000', opacity: 0.85 * (1 - waveLevel) }]} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  canvas: { position: 'absolute' },
  text: { position: 'absolute', fontWeight: '900', textTransform: 'uppercase', textAlign: 'center' },
  dot: { position: 'absolute' },
});
