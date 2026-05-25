import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { AppList } from '../components/AppList';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { toast } from '../services/toast';
import { notesApi, type Note } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

const NOTE_COLORS = [
  '#7B2FF7', '#F107A3', '#FF6B35', '#00C9A7', '#4FACFE', '#F093FB',
];

function NoteCard({ note, onEdit, onDelete, onPin }: {
  note: Note;
  onEdit:   (note: Note) => void;
  onDelete: (id: string) => void;
  onPin:    (note: Note) => void;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify()}
      style={[styles.noteCard, { borderLeftColor: note.color }]}
    >
      <TouchableOpacity style={styles.noteInner} onPress={() => onEdit(note)} activeOpacity={0.8}>
        <View style={styles.noteHeader}>
          <View style={[styles.colorDot, { backgroundColor: note.color }]} />
          <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
          <View style={styles.noteActions}>
            <TouchableOpacity onPress={() => onPin(note)} hitSlop={8}>
              <Ionicons
                name={note.isPinned ? 'bookmark' : 'bookmark-outline'}
                size={16}
                color={note.isPinned ? note.color : COLORS.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(note.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.notePreview} numberOfLines={3}>{note.content}</Text>
        <Text style={styles.noteDate}>
          {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface NoteEditorProps {
  visible:  boolean;
  note:     Partial<Note> | null;
  onClose:  () => void;
  onSave:   (data: { title: string; content: string; color: string }) => Promise<void>;
}

function NoteEditor({ visible, note, onClose, onSave }: NoteEditorProps) {
  const [title,   setTitle]   = useState(note?.title   ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [color,   setColor]   = useState(note?.color   ?? NOTE_COLORS[0]);
  const [saving,  setSaving]  = useState(false);

  React.useEffect(() => {
    if (visible) {
      setTitle(note?.title ?? '');
      setContent(note?.content ?? '');
      setColor(note?.color ?? NOTE_COLORS[0]);
    }
  }, [visible, note]);

  const handleSave = async () => {
    if (!title.trim()) { toast.show('Add a title', 'error'); return; }
    if (!content.trim()) { toast.show('Write something', 'error'); return; }
    setSaving(true);
    await onSave({ title: title.trim(), content: content.trim(), color });
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.editorRoot}>
          <LinearGradient
            colors={['#1A0A2E', '#0F0F0F']}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Header */}
          <SafeAreaView edges={['top']}>
            <View style={styles.editorHeader}>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.editorTitle}>{note?.id ? 'Edit note' : 'New note'}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <LinearGradient
                  colors={COLORS.gradient.primary}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.saveBtn}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {/* Color picker */}
            <View style={styles.colorRow}>
              {NOTE_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorOptionActive]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <View style={[styles.titleBorder, { borderLeftColor: color }]}>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Note title…"
                placeholderTextColor={COLORS.textMuted}
                maxLength={80}
              />
            </View>

            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="Write your thoughts…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
            <Text style={styles.charCount}>{content.length}/5000</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function NotebookScreen() {
  const [notes,     setNotes]     = useState<Note[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState<Partial<Note> | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notesApi.list();
      setNotes(res.data.data ?? []);
    } catch {
      toast.show('Could not load notes', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async (data: { title: string; content: string; color: string }) => {
    try {
      if (editing?.id) {
        const res = await notesApi.update(editing.id, data);
        setNotes((prev) => prev.map((n) => n.id === editing.id ? res.data.data : n));
      } else {
        const res = await notesApi.create(data);
        setNotes((prev) => [res.data.data, ...prev]);
      }
      setShowEditor(false);
      toast.show(editing?.id ? 'Note updated' : 'Note saved', 'success');
    } catch {
      toast.show('Could not save note', 'error');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete note', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await notesApi.delete(id);
            setNotes((prev) => prev.filter((n) => n.id !== id));
            toast.show('Note deleted', 'success');
          } catch {
            toast.show('Could not delete note', 'error');
          }
        },
      },
    ]);
  };

  const handlePin = async (note: Note) => {
    try {
      const res = await notesApi.update(note.id, { isPinned: !note.isPinned });
      setNotes((prev) => {
        const updated = prev.map((n) => n.id === note.id ? res.data.data : n);
        return [...updated.filter((n) => n.isPinned), ...updated.filter((n) => !n.isPinned)];
      });
    } catch {
      toast.show('Could not update note', 'error');
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0A2E', '#0F0F0F', '#0F0F0F']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Notebook</Text>
            <Text style={styles.headerSub}>{notes.length} private notes</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setEditing(null); setShowEditor(true); }}
            activeOpacity={0.8}
          >
            <LinearGradient colors={COLORS.gradient.primary} style={styles.addBtnGrad}>
              <Ionicons name="add" size={22} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLoader key={i} width="100%" height={100} borderRadius={RADIUS.lg} />
            ))}
          </View>
        ) : (
          <AppList
            data={notes}
            keyExtractor={(item) => item.id}
            estimatedItemSize={110}
            renderItem={({ item }) => (
              <NoteCard
                note={item}
                onEdit={(n) => { setEditing(n); setShowEditor(true); }}
                onDelete={handleDelete}
                onPin={handlePin}
              />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <EmptyState
                icon="book-outline"
                title="Your notebook is empty"
                description="Jot down thoughts, ideas, or things you want to remember."
                actionLabel="Write first note"
                onAction={() => { setEditing(null); setShowEditor(true); }}
              />
            }
          />
        )}
      </SafeAreaView>

      <NoteEditor
        visible={showEditor}
        note={editing}
        onClose={() => setShowEditor(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },
  flex:   { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  headerSub:   { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 1 },
  addBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  addBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  skeletonWrap: { padding: SPACING.lg, gap: SPACING.md },
  listContent:  { padding: SPACING.lg, gap: SPACING.md },

  noteCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 3,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  noteInner:   { padding: SPACING.md },
  noteHeader:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 6 },
  colorDot:    { width: 8, height: 8, borderRadius: 4 },
  noteTitle:   { flex: 1, color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: '700' },
  noteActions: { flexDirection: 'row', gap: SPACING.sm },
  notePreview: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, lineHeight: 18, marginBottom: 8 },
  noteDate:    { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },

  // Editor
  editorRoot: { flex: 1 },
  editorHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  editorTitle: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  saveBtn: { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full },
  saveBtnText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  colorRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  colorOption: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorOptionActive: { borderColor: COLORS.white, transform: [{ scale: 1.2 }] },
  titleBorder: {
    borderLeftWidth: 3,
    marginHorizontal: SPACING.lg,
    paddingLeft: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  titleInput: {
    color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '700',
  },
  contentInput: {
    marginHorizontal: SPACING.lg,
    color: COLORS.text, fontSize: FONTS.sizes.md, lineHeight: 24,
    minHeight: 240,
  },
  charCount: {
    color: COLORS.textMuted, fontSize: FONTS.sizes.xs,
    textAlign: 'right', marginRight: SPACING.lg, marginTop: 4,
  },
});
