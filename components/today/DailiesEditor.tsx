// Shared dailies editor — the drag-to-reorder edit interface used by BOTH the
// Today screen's Edit mode and onboarding's "Define your dailies" step. Operates
// directly on the dailies store (useDailies): drag to reorder + re-bucket, "−"
// to remove, "+ Add to {section}" to pull from the catalog or create a custom.
//
// `header` renders inside the list, above the pinned first section ("Morning"),
// so a row can never be dragged above it. Today passes the counter + hero;
// onboarding passes its title + intro card.
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from 'react-native-draggable-flatlist';
import { Minus, Plus, Menu } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { fontFamily, fontSize, spacing, shadows, type Tokens } from '@/constants/designTokens';
import { useTokens, useThemedStyles } from '@/hooks/useTokens';
import { resolveTone, resolveSubtitle, resolveGlyph } from '@/components/dailyTokens';
import { AddSheet, CreateSheet, type Template } from '@/components/today/DailiesEditSheets';
import { useDailies, type DailyItem, type WhenBucket } from '@/hooks/use-dailies-store';

const SECTIONS: WhenBucket[] = ['Morning', 'Anytime', 'Evening'];

// Flattened rows for the drag list: a section header, its dailies, and a "+ Add"
// row, per bucket. Dropping a daily under a different header re-buckets it.
type EditRow =
  | { type: 'header'; key: string; when: WhenBucket }
  | { type: 'daily'; key: string; item: DailyItem; isLast: boolean }
  | { type: 'add'; key: string; when: WhenBucket };

// A single editable daily row: drag handle (long-press to reorder) + the action's
// own icon + label + remove.
function EditDailyRow({ item, dragging, onRemove, onDragStart }: {
  item: DailyItem; dragging: boolean; onRemove: () => void; onDragStart: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c, mode } = useTokens();
  const { showSubtitles } = useDailies();
  const tone = resolveTone(item.color, mode);
  const Glyph = resolveGlyph(item.icon);
  const sub = item.subtitle !== undefined ? item.subtitle : showSubtitles ? resolveSubtitle(item.action) : undefined;
  return (
    <View style={[styles.row, dragging && styles.rowDragging]}>
      <Pressable style={styles.dragHandle} onLongPress={onDragStart} delayLongPress={150} accessibilityLabel={`Drag ${item.label} to reorder`}>
        <Menu size={22} color={c.textMuted} strokeWidth={2} />
      </Pressable>
      <View style={[styles.med, { backgroundColor: tone.soft }]}>
        <Glyph size={20} color={tone.ink} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel} numberOfLines={2}>{item.label}</Text>
        {sub ? <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <View style={styles.editControls}>
        <Pressable hitSlop={6} style={styles.removeBtn} onPress={onRemove} accessibilityLabel={`Remove ${item.label}`}>
          <Minus size={14} color="#fff" strokeWidth={3} />
        </Pressable>
      </View>
    </View>
  );
}

export default function DailiesEditor({ header, headerAccessory, contentContainerStyle }: {
  header?: React.ReactNode;
  // Rendered on the pinned first section's title line, right-aligned — Today
  // puts its "Save" there so it lands exactly where the pencil was. Onboarding
  // passes nothing and the title row is unchanged.
  headerAccessory?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(makeStyles);
  const { c, colors } = useTokens();
  const dailies = useDailies();
  const [addSection, setAddSection] = useState<WhenBucket | null>(null);
  const [createSection, setCreateSection] = useState<WhenBucket | null>(null);

  // One flat drag list across all three sections. The FIRST section's header
  // (Morning) is pinned in the list header instead of the data, so a row can
  // never be dragged above it.
  const editData = useMemo<EditRow[]>(() => {
    const rows: EditRow[] = [];
    SECTIONS.forEach((when, si) => {
      if (si > 0) rows.push({ type: 'header', key: `h-${when}`, when });
      dailies.program
        .filter((d) => d.when === when)
        .forEach((item, idx, arr) => rows.push({ type: 'daily', key: `d-${item.id}`, item, isLast: idx === arr.length - 1 }));
      rows.push({ type: 'add', key: `a-${when}`, when });
    });
    return rows;
  }, [dailies.program]);

  const listHeader = (
    <>
      {header}
      <View style={[styles.dragHeader, headerAccessory ? styles.dragHeaderRow : null]}>
        <Text style={[styles.sectionTitle, styles.dragHeaderText, { color: c.text }]}>{SECTIONS[0]}</Text>
        {headerAccessory}
      </View>
    </>
  );

  // Rebuild the program from the dropped order; a daily's bucket = the section
  // header above it in the list.
  const handleDragEnd = useCallback(({ data }: { data: EditRow[] }) => {
    const next: DailyItem[] = [];
    let when: WhenBucket = SECTIONS[0];
    data.forEach((row) => {
      if (row.type === 'header') when = row.when;
      else if (row.type === 'daily') next.push({ ...row.item, when });
    });
    dailies.setAll(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [dailies]);

  const addedActions = new Set(dailies.program.map((i) => i.action));

  const renderEditRow = useCallback(({ item: row, drag, isActive }: RenderItemParams<EditRow>) => {
    if (row.type === 'header') {
      return (
        <View style={styles.dragHeader}>
          <Text style={[styles.sectionTitle, styles.dragHeaderText, { color: c.text }]}>{row.when}</Text>
        </View>
      );
    }
    if (row.type === 'add') {
      return (
        <View style={styles.dragAdd}>
          <Pressable style={[styles.addPill, styles.addPillFlush]} onPress={() => setAddSection(row.when)}>
            <Plus size={16} color={colors.primary} strokeWidth={2.4} />
            <Text style={styles.addPillText}>Add to {row.when}</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <ScaleDecorator activeScale={1.03}>
        <EditDailyRow
          item={row.item}
          dragging={isActive}
          onRemove={() => dailies.removeDaily(row.item.id)}
          onDragStart={drag}
        />
      </ScaleDecorator>
    );
  }, [c.text, colors.primary, dailies, styles]);

  return (
    <>
      <DraggableFlatList
        data={editData}
        keyExtractor={(row) => row.key}
        renderItem={renderEditRow}
        onDragEnd={handleDragEnd}
        onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
        ListHeaderComponent={listHeader}
        containerStyle={styles.flex}
        contentContainerStyle={contentContainerStyle ?? styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {addSection && (
        <AddSheet
          section={addSection}
          added={addedActions}
          onClose={() => setAddSection(null)}
          onAdd={(t: Template) => { dailies.addDaily(t, addSection); setAddSection(null); }}
          onCreate={() => { const s = addSection; setAddSection(null); setCreateSection(s); }}
        />
      )}

      {createSection && (
        <CreateSheet
          section={createSection}
          onClose={() => setCreateSection(null)}
          onCreate={(label: string, when: WhenBucket, notes: string) => {
            dailies.addDaily({ label, subtitle: notes || undefined, icon: 'circle', color: 'gray', action: 'custom', custom: true }, when);
            setCreateSection(null);
          }}
        />
      )}
    </>
  );
}

const makeStyles = (tk: Tokens) => {
  const { c, colors, isDark } = tk;
  // Same cheap dark card chrome as the Today ledger rows.
  const darkCard = isDark
    ? { borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.12)' }
    : null;
  return StyleSheet.create({
    flex: { flex: 1 },
    scroll: { paddingHorizontal: 22, paddingBottom: 120 },
    sectionTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xl, marginBottom: 12 },
    // Drag-list cells use padding (not margin) so onLayout heights stay correct.
    dragHeader: { paddingTop: spacing.xl, paddingBottom: 12 },
    // Title left, accessory (Today's "Save") across from it on the same line —
    // mirrors the Today ledger's own section head.
    dragHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dragHeaderText: { marginBottom: 0 },
    dragAdd: { paddingTop: 12 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14,
      paddingVertical: 11, paddingHorizontal: 13, marginBottom: 12, ...shadows.sm, ...darkCard,
    },
    rowDragging: { ...shadows.md },
    // Plain hamburger handle sitting to the left of the action icon; long-press
    // to drag. Muted so the action icon stays the row's visual anchor.
    dragHandle: { paddingVertical: 6, paddingHorizontal: 2, marginLeft: -2, marginRight: -2, alignItems: 'center', justifyContent: 'center' },
    med: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1 },
    rowLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, lineHeight: 20, color: c.text },
    rowSub: { fontFamily: fontFamily.regular, fontSize: 12, color: c.textMuted, marginTop: 2 },
    editControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    removeBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#D8584E', alignItems: 'center', justifyContent: 'center' },
    addPill: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      marginTop: 12, paddingVertical: 11, borderRadius: 14,
      borderWidth: 1.5, borderColor: colors.primary + '55', borderStyle: 'dashed',
    },
    addPillFlush: { marginTop: 0 },
    addPillText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: colors.primaryDark },
  });
};
