import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { useStore } from "../store/useStore";
import {
  generateCardDataBatch,
  generateCardData,
  generateCardsFromImage,
  CardData,
} from "../lib/gemini";
import { triggerHaptic } from "../constants/theme";
import { createDefaultFSRSState } from "../lib/srs";
import { getGeminiErrorMessage, getDatabaseErrorMessage } from "../lib/errorHandler";

export interface SelectedImageAsset {
  uri: string;
  base64: string;
  mimeType: string;
}

export function useAICardGenerator(initialDeckId?: string, onClose?: () => void) {
  const decks = useStore((s) => s.decks);
  const addCardsBatch = useStore((s) => s.addCardsBatch);

  const [prompt, setPrompt] = useState("");
  const [selectedImage, setSelectedImage] = useState<SelectedImageAsset | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string>(
    initialDeckId || (decks.length > 0 ? decks[0].id : ""),
  );
  const [isDeckPickerOpen, setIsDeckPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<CardData[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleTakePhoto = useCallback(async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    triggerHaptic("selection");

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage(
          "Vui lòng cấp quyền truy cập Camera trong Cài đặt để chụp ảnh trích xuất từ vựng.",
        );
        triggerHaptic("error");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset.base64) {
          setErrorMessage("Không thể đọc dữ liệu ảnh từ Camera. Vui lòng thử lại.");
          return;
        }
        setSelectedImage({
          uri: asset.uri,
          base64: asset.base64,
          mimeType: asset.mimeType || "image/jpeg",
        });
        triggerHaptic("light");
      }
    } catch {
      setErrorMessage("Không thể mở Camera trên thiết bị này.");
      triggerHaptic("error");
    }
  }, []);

  const handlePickImage = useCallback(async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    triggerHaptic("selection");

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage(
          "Vui lòng cấp quyền truy cập Thư viện ảnh để tải ảnh trích xuất từ vựng.",
        );
        triggerHaptic("error");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset.base64) {
          setErrorMessage("Không thể đọc dữ liệu ảnh đã chọn. Vui lòng thử ảnh khác.");
          return;
        }
        setSelectedImage({
          uri: asset.uri,
          base64: asset.base64,
          mimeType: asset.mimeType || "image/jpeg",
        });
        triggerHaptic("light");
      }
    } catch {
      setErrorMessage("Không thể mở Thư viện ảnh trên thiết bị này.");
      triggerHaptic("error");
    }
  }, []);

  const handleClearImage = useCallback(() => {
    triggerHaptic("selection");
    setSelectedImage(null);
    setErrorMessage(null);
    setInfoMessage(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedImage && !prompt.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    triggerHaptic("medium");

    try {
      const deduplicateBatch = useStore.getState().deduplicateBatch;

      if (selectedImage) {
        const rawVisionResults = await generateCardsFromImage(
          selectedImage.base64,
          selectedImage.mimeType,
          prompt.trim() || undefined,
        );

        if (!rawVisionResults || rawVisionResults.length === 0) {
          setErrorMessage(
            "AI không nhận diện được từ vựng nào trong ảnh. Vui lòng chụp rõ nét hơn hoặc thử ảnh khác.",
          );
          triggerHaptic("error");
          return;
        }

        const {
          unique: uniqueCards,
          removedDuplicatesCount,
          removedDatabaseWords,
        } = await deduplicateBatch(rawVisionResults);

        if (uniqueCards.length > 0) {
          setGeneratedCards(uniqueCards);
          setSelectedIndices(new Set(uniqueCards.map((_, i) => i)));
          if (removedDuplicatesCount > 0) {
            setInfoMessage(
              `Đã tự động lọc bỏ ${removedDuplicatesCount} từ bị trùng trong cơ sở dữ liệu (${removedDatabaseWords.join(", ")}).`,
            );
          } else {
            setInfoMessage(
              `AI đã phân tích ảnh và trích xuất thành công ${uniqueCards.length} từ vựng mới!`,
            );
          }
          triggerHaptic("success");
        } else {
          setGeneratedCards([]);
          setSelectedIndices(new Set());
          setErrorMessage(
            removedDuplicatesCount > 0
              ? `Tất cả ${removedDuplicatesCount} từ vựng trong ảnh (${removedDatabaseWords.join(", ")}) đều đã có sẵn trong cơ sở dữ liệu!`
              : "AI không tạo được từ vựng mới từ bức ảnh này.",
          );
          triggerHaptic("error");
        }
        return;
      }

      // Text input generation flow: pre-check duplicates before calling AI
      const rawInputs = prompt
        .split(/[,，\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const itemsToCheck = rawInputs.map((word) => ({ character: word }));
      const {
        unique: nonDuplicateInputs,
        removedDuplicatesCount: preRemovedCount,
        removedDatabaseWords: preRemovedWords,
      } = await deduplicateBatch(itemsToCheck);

      if (rawInputs.length > 1 && nonDuplicateInputs.length === 0) {
        setErrorMessage(
          `Tất cả ${rawInputs.length} từ vựng (${preRemovedWords.join(", ")}) đều đã có sẵn trong cơ sở dữ liệu!`,
        );
        triggerHaptic("error");
        setLoading(false);
        return;
      }

      const inputsToGenerate = nonDuplicateInputs.map((item) => item.character);

      const rawResults =
        inputsToGenerate.length > 1
          ? await generateCardDataBatch(inputsToGenerate)
          : [await generateCardData(prompt.trim())];

      const {
        unique: uniqueCards,
        removedDuplicatesCount: postRemovedCount,
        removedDatabaseWords: postRemovedWords,
      } = await deduplicateBatch(rawResults);

      const allRemovedWords = Array.from(new Set([...preRemovedWords, ...postRemovedWords]));
      const totalRemovedCount = preRemovedCount + postRemovedCount;

      if (uniqueCards.length > 0) {
        setGeneratedCards(uniqueCards);
        setSelectedIndices(new Set(uniqueCards.map((_, i) => i)));
        if (totalRemovedCount > 0) {
          setInfoMessage(
            `Đã tự động lọc bỏ ${totalRemovedCount} từ bị trùng trong cơ sở dữ liệu (${allRemovedWords.join(", ")}).`,
          );
        }
        triggerHaptic("success");
      } else {
        setGeneratedCards([]);
        setSelectedIndices(new Set());
        setErrorMessage(
          totalRemovedCount > 0
            ? `Từ vựng (${allRemovedWords.join(", ")}) đã có sẵn trong cơ sở dữ liệu!`
            : "AI không tạo được từ vựng từ từ khóa này. Vui lòng thử từ khóa khác.",
        );
        triggerHaptic("error");
      }
    } catch (err: unknown) {
      setErrorMessage(getGeminiErrorMessage(err));
      triggerHaptic("error");
    } finally {
      setLoading(false);
    }
  }, [prompt, selectedImage]);

  const toggleSelectCard = useCallback((index: number) => {
    triggerHaptic("selection");
    setSelectedIndices((prev) => {
      const updated = new Set(prev);
      if (updated.has(index)) {
        updated.delete(index);
      } else {
        updated.add(index);
      }
      return updated;
    });
  }, []);

  const handleSaveSelected = useCallback(async () => {
    if (!selectedDeckId) {
      setErrorMessage("Vui lòng chọn bộ thẻ trước khi nạp.");
      return;
    }

    const cardsToSave = generatedCards.filter((_, i) => selectedIndices.has(i));
    if (cardsToSave.length === 0) return;

    setLoading(true);
    triggerHaptic("medium");

    try {
      const formattedCards = cardsToSave.map((cardData) => ({
        deckId: selectedDeckId,
        character: cardData.character || "",
        traditional: cardData.traditional,
        pinyin: cardData.pinyin || "",
        hanviet: cardData.hanviet,
        translation: cardData.translation || "",
        examples: cardData.examples || [],
        radical: cardData.radical,
        strokeCount: cardData.strokeCount,
        hskLevel: cardData.hskLevel,
        tags: cardData.tags || (selectedImage ? ["Quét từ ảnh"] : ["AI-Generated"]),
        srs: createDefaultFSRSState(),
      }));

      await addCardsBatch(formattedCards);

      triggerHaptic("success");
      setPrompt("");
      setSelectedImage(null);
      setGeneratedCards([]);
      setSelectedIndices(new Set());
      setInfoMessage(null);
      setErrorMessage(null);
      if (onClose) onClose();
    } catch (err: unknown) {
      setErrorMessage(getDatabaseErrorMessage(err));
      triggerHaptic("error");
    } finally {
      setLoading(false);
    }
  }, [selectedDeckId, generatedCards, selectedIndices, selectedImage, addCardsBatch, onClose]);

  return {
    prompt,
    setPrompt,
    selectedImage,
    handleTakePhoto,
    handlePickImage,
    handleClearImage,
    selectedDeckId,
    setSelectedDeckId,
    isDeckPickerOpen,
    setIsDeckPickerOpen,
    loading,
    generatedCards,
    selectedIndices,
    errorMessage,
    infoMessage,
    decks,
    handleGenerate,
    toggleSelectCard,
    handleSaveSelected,
  };
}
