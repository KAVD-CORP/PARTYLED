import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UI } from '../constants/party';
import { GridCell } from '../types/session';

interface SwarmGridConfigProps {
  cols: number;
  rows: number;
  cells: GridCell[];
  onUpdateGrid: (cols: number, rows: number) => void;
  onMove: (clientId: string, cell: number) => void;
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepRow}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.max(min, value - 1))}><Text style={styles.stepTxt}>−</Text></TouchableOpacity>
        <Text style={styles.stepValue}>{value}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.min(max, value + 1))}><Text style={styles.stepTxt}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
}

export function SwarmGridConfig({ cols, rows, cells, onUpdateGrid, onMove }: SwarmGridConfigProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const byCell = new Map(cells.map((c) => [c.cell, c.clientId]));
  const filled = cells.filter((c) => c.cell < cols * rows).length;

  const tap = (cell: number) => {
    const occupant = byCell.get(cell);
    if (selected) {
      if (occupant !== selected) onMove(selected, cell);
      setSelected(null);
    } else if (occupant) {
      setSelected(occupant);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Billboard grid</Text>
        <Text style={styles.count}>{filled}/{cols * rows} filled</Text>
      </View>
      <View style={styles.steppers}>
        <Stepper label="COLUMNS" value={cols} min={1} max={8} onChange={(v) => onUpdateGrid(v, rows)} />
        <Stepper label="ROWS" value={rows} min={1} max={8} onChange={(v) => onUpdateGrid(cols, v)} />
      </View>

      <Text style={styles.stageLabel}>STAGE / FRONT ↑</Text>
      <View style={styles.grid}>
        {Array.from({ length: rows }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: cols }).map((__, c) => {
              const cell = r * cols + c;
              const occupant = byCell.get(cell);
              const isSelected = !!occupant && occupant === selected;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => tap(cell)}
                  style={[styles.cell, occupant && styles.cellFilled, isSelected && styles.cellSelected, selected && !occupant && styles.cellTarget]}
                >
                  <Text style={[styles.cellText, occupant && { color: UI.text }]}>{r + 1}·{c + 1}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
      <Text style={styles.help}>
        {selected ? 'Now tap the cell this phone should move to.' : 'Phones fill cells in join order. Tap a lit cell, then another cell, to move or swap phones.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: UI.card, borderRadius: UI.radius, borderWidth: 1, borderColor: UI.cardBorder, padding: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: UI.text, fontSize: 16, fontWeight: '800' },
  count: { color: UI.pink, fontWeight: '800', fontSize: 12 },
  steppers: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stepper: { flexGrow: 1, flexBasis: 130, backgroundColor: UI.raised, borderRadius: 12, padding: 10, alignItems: 'center', gap: 6 },
  stepLabel: { color: UI.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  stepTxt: { color: UI.text, fontSize: 18, fontWeight: '800' },
  stepValue: { color: UI.text, fontSize: 20, fontWeight: '900', minWidth: 22, textAlign: 'center' },
  stageLabel: { color: UI.faint, fontSize: 10, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  grid: { gap: 6, width: '100%', maxWidth: 380, alignSelf: 'center' },
  gridRow: { flexDirection: 'row', gap: 6 },
  cell: { flex: 1, aspectRatio: 1.4, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  cellFilled: { borderStyle: 'solid', borderColor: UI.pink, backgroundColor: 'rgba(255,0,119,0.25)' },
  cellSelected: { backgroundColor: UI.pink },
  cellTarget: { borderColor: UI.cyan },
  cellText: { color: UI.faint, fontSize: 11, fontWeight: '800' },
  help: { color: UI.muted, fontSize: 12, lineHeight: 17 },
});
