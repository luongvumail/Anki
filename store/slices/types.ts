import { SRSState, SRSGrade } from '../../lib/srs';

export interface Card {
  id: string;
  deckId: string;
  character: string;
  traditional?: string;
  pinyin: string;
  hanviet: string;
  translation: string;
  examples: Array<{ chinese: string; pinyin: string; vietnamese: string }>;
  radical?: string;
  strokeCount?: number;
  hskLevel?: number;
  tags?: string[];
  srs: SRSState;
  createdAt: string;
  updatedAt: string;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  cardCount: number;
  newCount: number;
  dueCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  deckId: string;
  queue: Card[];
  currentIndex: number;
  reviewedCount: number;
  correctCount: number;
  startTime: Date;
}
