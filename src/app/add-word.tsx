import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Alert,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { useAppStore } from '../services/store';
import { useHaptics } from '../hooks/useHaptics';
import { ChevronLeft, Search, Sparkles, PlusCircle } from 'lucide-react-native';
import { getMockAIResponse, AIWordResult } from '../utils/mockAI';

export default function AIAddWordScreen() {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIWordResult | null>(null);
  // editedResult: mutable copy user can change before saving
  const [editedResult, setEditedResult] = useState<AIWordResult | null>(null);
  const navigation = useNavigation();
  const isDiscardingRef = useRef(false);

  const { userId, loadQueue } = useAppStore();
  const { lightHaptic, successHaptic, warningHaptic } = useHaptics();

  // Helper: update a single field in editedResult
  const updateField = <K extends keyof AIWordResult>(field: K, value: AIWordResult[K]) => {
    setEditedResult((current) => (current ? { ...current, [field]: value } : current));
  };

  const hasUnsavedChanges = Boolean(searchText.trim() || editedResult);

  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    if (isDiscardingRef.current) {
      isDiscardingRef.current = false;
      navigation.dispatch(data.action);
      return;
    }

    Alert.alert('Bỏ thay đổi?', 'Nội dung bạn đã nhập hoặc chỉnh sửa sẽ không được lưu.', [
      { text: 'Ở lại', style: 'cancel' },
      {
        text: 'Bỏ thay đổi',
        style: 'destructive',
        onPress: () => {
          isDiscardingRef.current = true;
          setSearchText('');
          setResult(null);
          setEditedResult(null);
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  const handleAISearch = async () => {
    if (!searchText.trim()) {
      Alert.alert('Chú ý', 'Vui lòng nhập chữ Hán cần thêm');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    lightHaptic();

    try {
      // 1. Attempt to query Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('ai-quick-add', {
        body: { word: searchText.trim() },
      });

      if (error || !data) {
        console.log('Supabase Edge function invocation missed/failed:', error);
        if (error) {
          console.log('Error status:', error.status);
          try {
            const errText = await error.context.text();
            console.log('Error body:', errText);
          } catch (bodyErr) {
            console.log('Could not read error body:', bodyErr);
          }
        }
        console.log('Falling back to local AI simulator...');
        await new Promise((res) => setTimeout(res, 1200));
        const simulated = getMockAIResponse(searchText.trim());
        setResult(simulated);
        setEditedResult(simulated);
      } else {
        const parsed = data as AIWordResult;
        setResult(parsed);
        setEditedResult(parsed);
      }

      successHaptic();
    } catch (e) {
      console.warn('Network error or endpoint error, loading simulated response:', e);
      const simulated = getMockAIResponse(searchText.trim());
      setResult(simulated);
      setEditedResult(simulated);
      successHaptic();
    } finally {
      setLoading(false);
    }
  };

  const handleAddWordToCollection = async () => {
    if (!editedResult || !userId) return;

    setLoading(true);
    lightHaptic();

    try {
      // 1. Upsert radical details in DB if they don't exist
      const radicalIds: number[] = [];
      for (const rad of editedResult.radicals) {
        const { data: radData, error: radErr } = await supabase
          .from('radicals')
          .upsert(
            {
              character: rad.character,
              pinyin: rad.pinyin,
              vietnamese_name: rad.vietnamese_name,
              stroke_count: rad.stroke_count,
            },
            { onConflict: 'character' },
          )
          .select('id')
          .single();

        if (!radErr && radData) {
          radicalIds.push(radData.id);
        }
      }

      // 2. Check/Insert vocabulary details
      let vocabId = '';
      const { data: vocabCheck } = await supabase
        .from('vocabulary')
        .select('id')
        .eq('simplified', editedResult.simplified)
        .maybeSingle();

      if (vocabCheck) {
        vocabId = vocabCheck.id;
      } else {
        const { data: newVocab, error: insertErr } = await supabase
          .from('vocabulary')
          .insert({
            simplified: editedResult.simplified,
            traditional: editedResult.traditional || null,
            pinyin: editedResult.pinyin,
            han_viet: editedResult.han_viet,
            definition_vi: editedResult.definition_vi,
            audio_url: `https://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(editedResult.simplified)}`,
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        vocabId = newVocab.id;

        // 3. Link vocabulary and radicals
        for (const radId of radicalIds) {
          await supabase.from('vocabulary_radicals').insert({
            vocabulary_id: vocabId,
            radical_id: radId,
          });
        }
      }

      // 4. Create user progress tracker for SRS
      const { error: progErr } = await supabase.from('user_progress').upsert(
        {
          user_id: userId,
          vocabulary_id: vocabId,
          status: 'learning',
          interval_days: 0,
          ease_factor: 2.5,
          repetitions: 0,
          next_review_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,vocabulary_id' },
      );

      if (progErr) throw progErr;

      successHaptic();
      Alert.alert(
        'Thành công',
        `Đã thêm từ "${editedResult.simplified}" vào kho từ học tập cá nhân của bạn!`,
        [
          {
            text: 'OK',
            onPress: async () => {
              await loadQueue();
              setSearchText('');
              setResult(null);
              setEditedResult(null);
              router.back();
            },
          },
        ],
      );
    } catch (error: any) {
      warningHaptic();
      Alert.alert('Thất bại', error.message || 'Không thể lưu từ vựng vào tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    lightHaptic();
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ChevronLeft size={22} color="#FFFFFF" />
          <Text style={styles.backText}>Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Thêm từ bằng AI
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nhập chữ Hán cần học (Ví dụ: 学习)"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <TouchableOpacity style={styles.aiButton} onPress={handleAISearch} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Sparkles size={18} color="#FFFFFF" fill="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {loading && !result && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF2D55" />
            <Text style={styles.loadingText}>AI đang phân tích từ vựng...</Text>
          </View>
        )}

        {!loading && !result && (
          <View style={styles.emptyContainer}>
            <Sparkles size={48} color="#C7C7CC" />
            <Text style={styles.emptyText}>
              Nhập chữ Hán ở trên để AI tự động tra cứu bộ thủ, phiên âm, dịch âm Hán Việt và đặt
              câu ví dụ.
            </Text>
          </View>
        )}

        {result && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>KẾT QUẢ PHÂN TÍCH AI</Text>
            <Text style={styles.editHint}>✏️ Chỉnh sửa trực tiếp nếu AI phân tích sai</Text>

            {/* Visual preview card with editable fields */}
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewHanzi}>{result.simplified}</Text>
                {result.traditional && result.traditional !== result.simplified && (
                  <Text style={styles.previewTraditional}>Phồn thể: {result.traditional}</Text>
                )}
              </View>

              <View style={styles.previewDivider} />

              <View style={styles.previewBody}>
                {/* Pinyin — EDITABLE */}
                <View style={styles.dataField}>
                  <Text style={styles.fieldLabel}>Bính âm (Pinyin):</Text>
                  <TextInput
                    style={[styles.fieldValuePinyin, styles.editableField]}
                    value={editedResult?.pinyin ?? ''}
                    onChangeText={(v) => updateField('pinyin', v)}
                    placeholderTextColor="#6E6E73"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Hán Việt — EDITABLE */}
                <View style={styles.dataField}>
                  <Text style={styles.fieldLabel}>Âm Hán Việt:</Text>
                  <TextInput
                    style={[styles.fieldValueHanViet, styles.editableField]}
                    value={editedResult?.han_viet ?? ''}
                    onChangeText={(v) => updateField('han_viet', v)}
                    placeholderTextColor="#6E6E73"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Definition — EDITABLE */}
                <View style={styles.dataField}>
                  <Text style={styles.fieldLabel}>Nghĩa tiếng Việt:</Text>
                  <TextInput
                    style={[styles.fieldValueDef, styles.editableField]}
                    value={editedResult?.definition_vi ?? ''}
                    onChangeText={(v) => updateField('definition_vi', v)}
                    placeholderTextColor="#6E6E73"
                    multiline
                  />
                </View>

                {/* Radicals — display only */}
                {result.radicals && result.radicals.length > 0 && (
                  <View style={styles.dataField}>
                    <Text style={styles.fieldLabel}>Bộ thủ:</Text>
                    <View style={styles.radicalsRow}>
                      {result.radicals.map((rad, idx) => (
                        <View key={idx} style={styles.radicalBadge}>
                          <Text style={styles.radicalChar}>{rad.character}</Text>
                          <Text style={styles.radicalText}>{rad.vietnamese_name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Example sentence — EDITABLE */}
                <View style={styles.dataField}>
                  <Text style={styles.fieldLabel}>Đặt câu ví dụ:</Text>
                  <View style={styles.exampleContainer}>
                    <TextInput
                      style={[styles.exampleZh, styles.editableField]}
                      value={editedResult?.example_zh ?? ''}
                      onChangeText={(v) => updateField('example_zh', v)}
                      placeholderTextColor="#6E6E73"
                      multiline
                    />
                    <TextInput
                      style={[styles.examplePinyin, styles.editableField]}
                      value={editedResult?.example_pinyin ?? ''}
                      onChangeText={(v) => updateField('example_pinyin', v)}
                      placeholderTextColor="#6E6E73"
                      autoCapitalize="none"
                      multiline
                    />
                    <TextInput
                      style={[styles.exampleVi, styles.editableField]}
                      value={editedResult?.example_vi ?? ''}
                      onChangeText={(v) => updateField('example_vi', v)}
                      placeholderTextColor="#6E6E73"
                      multiline
                    />
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddWordToCollection}
              disabled={loading}
            >
              <PlusCircle size={22} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Xác nhận & Thêm vào bài học</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120E2E', // Deep ambient dark violet background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#120E2E',
  },
  backButton: {
    width: 88,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 88,
  },
  searchSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#120E2E',
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  aiButton: {
    width: 46,
    height: 46,
    backgroundColor: '#FF2D55',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 80,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#AEAEB2',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#AEAEB2',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  resultContainer: {
    gap: 14,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1,
  },
  editHint: {
    fontSize: 12,
    color: '#FFD60A',
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
  previewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  previewHanzi: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  previewTraditional: {
    fontSize: 14,
    color: '#AEAEB2',
    fontWeight: '600',
  },
  previewDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 14,
  },
  previewBody: {
    gap: 14,
  },
  dataField: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValuePinyin: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD60A', // Gold
  },
  fieldValueHanViet: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  fieldValueDef: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
    lineHeight: 20,
  },
  radicalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  radicalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  radicalChar: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF2D55',
  },
  radicalText: {
    fontSize: 12,
    color: '#AEAEB2',
    fontWeight: '500',
  },
  exampleContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 4,
    marginTop: 2,
  },
  exampleZh: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  examplePinyin: {
    fontSize: 13,
    color: '#FFD60A',
    fontWeight: '500',
  },
  exampleVi: {
    fontSize: 13,
    color: '#AEAEB2',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#FF2D55',
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Editable field: subtle underline to hint it's tappable
  editableField: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.18)',
    paddingBottom: 2,
    paddingTop: 0,
    minHeight: undefined,
  },
});
