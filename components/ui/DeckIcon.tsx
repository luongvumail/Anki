import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, VECTOR_DECK_ICONS } from '../../constants/theme';

interface DeckIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export function DeckIcon({ name, size = 18, color = Colors.accent.indigoLight, style }: DeckIconProps) {
  const icon = VECTOR_DECK_ICONS.includes(name)
    ? (name as keyof typeof Ionicons.glyphMap)
    : 'book-outline';
  return <Ionicons name={icon} size={size} color={color} style={style} />;
}
