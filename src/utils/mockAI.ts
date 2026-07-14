export interface AIRadical {
  character: string;
  pinyin: string;
  vietnamese_name: string;
  stroke_count: number;
}

export interface AIWordResult {
  simplified: string;
  traditional?: string;
  pinyin: string;
  han_viet: string;
  definition_vi: string;
  example_zh: string;
  example_pinyin: string;
  example_vi: string;
  radicals: AIRadical[];
}

/**
 * Returns mock dictionary analysis fallback when Supabase Edge Function misses.
 */
export const getMockAIResponse = (word: string): AIWordResult => {
  const dict: Record<string, AIWordResult> = {
    '学习': {
      simplified: '学习',
      traditional: '學習',
      pinyin: 'xué xí',
      han_viet: 'học tập',
      definition_vi: 'Học tập, học hành, nghiên cứu.',
      example_zh: '我们必须好好学习。',
      example_pinyin: 'Wǒmen bìxū hǎohǎo xuéxí.',
      example_vi: 'Chúng ta phải học tập thật tốt.',
      radicals: [
        { character: '子', pinyin: 'zǐ', vietnamese_name: 'Tử (Con cái)', stroke_count: 3 },
      ],
    },
    '老师': {
      simplified: '老师',
      traditional: '老師',
      pinyin: 'lǎo shī',
      han_viet: 'lão sư',
      definition_vi: 'Thầy giáo, cô giáo, giảng viên.',
      example_zh: '老师正在上课。',
      example_pinyin: 'Lǎoshī zhèngzài shàngkè.',
      example_vi: 'Thầy giáo đang giảng bài.',
      radicals: [
        { character: '⼫', pinyin: 'shī', vietnamese_name: 'Thi (Xác chết)', stroke_count: 3 },
      ],
    },
    '中国': {
      simplified: '中国',
      traditional: '中國',
      pinyin: 'zhōng guó',
      han_viet: 'trung quốc',
      definition_vi: 'Đất nước Trung Quốc.',
      example_zh: '中国是一个美丽的国家。',
      example_pinyin: 'Zhōngguó shì yí gè měilì de guójiā.',
      example_vi: 'Trung Quốc là một quốc gia xinh đẹp.',
      radicals: [
        { character: '⼞', pinyin: 'wéi', vietnamese_name: 'Vi (Vây quanh)', stroke_count: 3 },
      ],
    },
    '谢谢': {
      simplified: '谢谢',
      traditional: '謝謝',
      pinyin: 'xiè xie',
      han_viet: 'tạ tạ',
      definition_vi: 'Cảm ơn, tạ ơn.',
      example_zh: '谢谢你的帮助。',
      example_pinyin: 'Xièxie nǐ de bāngzhù.',
      example_vi: 'Cảm ơn sự giúp đỡ của bạn.',
      radicals: [
        { character: '⾨', pinyin: 'mén', vietnamese_name: 'Môn (Cửa)', stroke_count: 3 },
      ],
    },
  };

  const term = word.trim();
  if (dict[term]) return dict[term];

  // Generic algorithm to generate a semi-realistic fallback
  return {
    simplified: term,
    traditional: term,
    pinyin: 'mó nǐ',
    han_viet: 'mô phỏng',
    definition_vi: `Từ vựng được thêm vào từ khóa "${term}"`,
    example_zh: `我喜欢 this word: ${term}。`,
    example_pinyin: `Wǒ xǐhuan zhège cíyǔ: ${term}.`,
    example_vi: `Tôi thích từ vựng này: ${term}.`,
    radicals: [
      { character: '⼁', pinyin: 'shù', vietnamese_name: 'Sổ (Nét thẳng đứng)', stroke_count: 1 },
    ],
  };
};
