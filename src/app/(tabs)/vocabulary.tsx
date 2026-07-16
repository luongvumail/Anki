import { useAudio } from '@/hooks/useAudio';
import { useHaptics } from '@/hooks/useHaptics';
import { localSyncQueue, localVocab } from '@/services/sqlite';
import { useAppStore } from '@/services/store';
import { syncLocalChanges } from '@/services/sync';
import { router } from 'expo-router';
import { ChevronLeft, HelpCircle, Search, Trash2, Volume2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const PAGE_SIZE = 20;

interface VocabItem {
  id: string;
  simplified: string;
  traditional?: string | null;
  pinyin: string;
  han_viet: string;
  definition_vi: string;
  audio_url?: string | null;
  radicals_json?: string | null;
  example_zh?: string | null;
  example_pinyin?: string | null;
  example_vi?: string | null;
  status?: 'learning' | 'reviewing' | 'mastered' | null;
}

export default function VocabularyScreen() {
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'learning' | 'reviewing' | 'mastered'>(
    'all',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    all: 0,
    learning: 0,
    reviewing: 0,
    mastered: 0,
  });
  const pageRef = useRef(0);
  const filterRef = useRef(activeFilter);
  const searchRef = useRef(searchText);

  const { lightHaptic, successHaptic, warningHaptic } = useHaptics();
  const { playAudio } = useAudio();
  const { loadQueue } = useAppStore();

  const loadPage = useCallback((page: number, filter: string, search: string, append: boolean) => {
    try {
      const offset = page * PAGE_SIZE;
      const data = localVocab.getAllWithProgressPaginated({
        status: filter === 'all' ? undefined : filter,
        search: search || undefined,
        limit: PAGE_SIZE,
        offset,
      }) as VocabItem[];

      if (append) {
        setVocabList((prev) => [...prev, ...data]);
      } else {
        setVocabList(data);
      }
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      console.error('Failed to load vocabulary list:', e);
    }
  }, []);

  const loadTotalCount = useCallback((filter: string, search: string) => {
    try {
      const count = localVocab.getCount({
        status: filter === 'all' ? undefined : filter,
        search: search || undefined,
      });
      setTotalCount(count);
    } catch (e) {
      console.error('Failed to load vocabulary count:', e);
    }
  }, []);

  const fetchFirstPage = useCallback(
    (filter: string, search: string) => {
      setIsLoading(true);
      pageRef.current = 0;
      loadPage(0, filter, search, false);
      loadTotalCount(filter, search);
      // Load status counts for filter tabs
      try {
        const counts = localVocab.getStatusCounts();
        setStatusCounts(counts);
      } catch (e) {
        console.error('Failed to load status counts:', e);
      }
      setIsLoading(false);
    },
    [loadPage, loadTotalCount],
  );

  const handleRefresh = useCallback(async () => {
    lightHaptic();
    setIsRefreshing(true);
    try {
      await syncLocalChanges();
    } catch (e) {
      console.log('Refresh sync skipped:', e);
    } finally {
      fetchFirstPage(filterRef.current, searchRef.current);
      setIsRefreshing(false);
    }
  }, [fetchFirstPage, lightHaptic]);

  useEffect(() => {
    filterRef.current = activeFilter;
    searchRef.current = searchText;
    fetchFirstPage(activeFilter, searchText);
  }, [activeFilter, searchText, fetchFirstPage]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    loadPage(nextPage, filterRef.current, searchRef.current, true);
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, loadPage]);

  const handleBack = () => {
    lightHaptic();
    router.back();
  };

  const handleDeleteWord = (item: VocabItem) => {
    warningHaptic();
    Alert.alert(
      'Xóa từ vựng',
      `Bạn có chắc chắn muốn xóa từ "${item.simplified}" khỏi danh sách học tập không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Delete locally from SQLite
              localVocab.delete(item.id);

              // 2. Queue sync delete action for Supabase
              localSyncQueue.enqueue('DELETE', 'user_progress', { vocabulary_id: item.id });

              // 3. Reload current page
              loadPage(pageRef.current, filterRef.current, searchRef.current, false);

              // 4. Reload main queue to make sure it doesn't appear
              await loadQueue();

              successHaptic();

              // 5. Trigger background sync silently
              syncLocalChanges().catch(() => {});
            } catch (err) {
              console.error('Failed to delete word:', err);
              Alert.alert('Lỗi', 'Không thể xóa từ vựng.');
            }
          },
        },
      ],
    );
  };

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'mastered':
        return { text: 'Đã thuộc', color: '#30D158', bg: 'rgba(48, 209, 88, 0.15)' };
      case 'reviewing':
        return { text: 'Ôn tập', color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.15)' };
      case 'learning':
      default:
        return { text: 'Đang học', color: '#FFD60A', bg: 'rgba(255, 214, 10, 0.15)' };
    }
  };

  const renderVocabCard = ({ item }: { item: VocabItem }) => {
    const badge = getStatusBadge(item.status);

    return (
      <View style={styles.vocabCard}>
        <View style={styles.cardMain}>
          <View style={styles.hanziContainer}>
            <Text style={styles.simplifiedText}>{item.simplified}</Text>
            {item.traditional && item.traditional !== item.simplified && (
              <Text style={styles.traditionalText}>({item.traditional})</Text>
            )}
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.pinyinText}>{item.pinyin}</Text>
            <Text style={styles.hanVietText}>{item.han_viet.toUpperCase()}</Text>
            <Text style={styles.defText} numberOfLines={2}>
              {item.definition_vi}
            </Text>
          </View>
        </View>

        {item.example_zh && (
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleZh}>{item.example_zh}</Text>
            <Text style={styles.exampleVi}>{item.example_vi}</Text>
          </View>
        )}

        <View style={styles.cardActions}>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
          </View>

          <View style={styles.actionButtons}>
            {item.audio_url && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  lightHaptic();
                  playAudio(item.audio_url, item.simplified);
                }}
              >
                <Volume2 size={18} color="#FFD60A" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => handleDeleteWord(item)}
            >
              <Trash2 size={18} color="#FF453A" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ChevronLeft size={22} color="#FFFFFF" />
          <Text style={styles.backText}>Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Sổ từ vựng cá nhân
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo Hán tự, bính âm, Hán Việt..."
            placeholderTextColor="#8E8E93"
            value={searchText}
            onChangeText={(t) => {
              setSearchText(t);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'all' && styles.activeFilterTab]}
          onPress={() => {
            lightHaptic();
            setActiveFilter('all');
          }}
        >
          <Text
            style={[styles.filterTabText, activeFilter === 'all' && styles.activeFilterTabText]}
          >
            Tất cả ({statusCounts.all})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'learning' && styles.activeFilterTab]}
          onPress={() => {
            lightHaptic();
            setActiveFilter('learning');
          }}
        >
          <Text
            style={[
              styles.filterTabText,
              activeFilter === 'learning' && styles.activeFilterTabText,
            ]}
          >
            Đang học ({statusCounts.learning})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'reviewing' && styles.activeFilterTab]}
          onPress={() => {
            lightHaptic();
            setActiveFilter('reviewing');
          }}
        >
          <Text
            style={[
              styles.filterTabText,
              activeFilter === 'reviewing' && styles.activeFilterTabText,
            ]}
          >
            Ôn tập ({statusCounts.reviewing})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'mastered' && styles.activeFilterTab]}
          onPress={() => {
            lightHaptic();
            setActiveFilter('mastered');
          }}
        >
          <Text
            style={[
              styles.filterTabText,
              activeFilter === 'mastered' && styles.activeFilterTabText,
            ]}
          >
            Đã thuộc ({statusCounts.mastered})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF2D55" />
        </View>
      ) : vocabList.length === 0 ? (
        <View style={styles.centerContainer}>
          <HelpCircle size={48} color="#C7C7CC" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>Không tìm thấy từ vựng nào.</Text>
        </View>
      ) : (
        <FlatList
          data={vocabList}
          keyExtractor={(item) => item.id}
          renderItem={renderVocabCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#FF2D55" />
                <Text style={styles.footerText}>Đang tải thêm...</Text>
              </View>
            ) : !hasMore && vocabList.length > 0 ? (
              <Text style={styles.footerEndText}>Đã hiển thị tất cả {totalCount} từ</Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120E2E',
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
    padding: 16,
    backgroundColor: '#120E2E',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
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
  filterSection: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeFilterTab: {
    backgroundColor: '#FF2D55',
    borderColor: '#FF2D55',
  },
  filterTabText: {
    fontSize: 12,
    color: '#AEAEB2',
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 14,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: '#AEAEB2',
    textAlign: 'center',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  vocabCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardMain: {
    flexDirection: 'row',
    gap: 16,
  },
  hanziContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  simplifiedText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  traditionalText: {
    fontSize: 11,
    color: '#AEAEB2',
    marginTop: 2,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  pinyinText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFD60A',
  },
  hanVietText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  defText: {
    fontSize: 13,
    color: '#AEAEB2',
    lineHeight: 18,
  },
  exampleContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    gap: 2,
  },
  exampleZh: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E5EA',
  },
  exampleVi: {
    fontSize: 12,
    color: '#8E8E93',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  deleteBtn: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderColor: 'rgba(255, 69, 58, 0.15)',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
  },
  footerEndText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    paddingVertical: 16,
  },
});
