import { collection, doc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

export function getUserId() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

export function decksRef(uid: string) {
  return collection(db, 'users', uid, 'decks');
}

export function cardsRef(uid: string, deckId: string) {
  return collection(db, 'users', uid, 'decks', deckId, 'cards');
}

export function cardRef(uid: string, deckId: string, cardId: string) {
  return doc(db, 'users', uid, 'decks', deckId, 'cards', cardId);
}
