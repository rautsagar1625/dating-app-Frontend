import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

interface PinPadProps {
  title?: string;
  onComplete: (pin: string) => void;
  onCancel?: () => void;
  errorMessage?: string | null;
}

export function PinPad({ title = 'Enter PIN', onComplete, onCancel, errorMessage }: PinPadProps) {
  const [input, setInput] = useState('');

  const handleKey = (key: string) => {
    if (key === '⌫') {
      setInput((prev) => prev.slice(0, -1));
      return;
    }
    if (key === '' || input.length >= 4) return;
    const next = input + key;
    setInput(next);
    if (next.length === 4) {
      onComplete(next);
      setInput('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              input.length > i && styles.dotFilled,
              errorMessage && styles.dotError,
            ]}
          />
        ))}
      </View>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : (
        <View style={styles.errorPlaceholder} />
      )}

      <View style={styles.grid}>
        {KEYS.map((key, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, key === '' && styles.keyEmpty]}
            onPress={() => handleKey(key)}
            disabled={key === ''}
            activeOpacity={0.6}
          >
            {key === '⌫' ? (
              <Ionicons name="backspace-outline" size={22} color="#333" />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {onCancel && (
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 28,
    letterSpacing: 0.3,
  },
  dots: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  dotError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FF3B30',
  },
  errorPlaceholder: { height: 18, marginBottom: 16 },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
    height: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    gap: 12,
    justifyContent: 'center',
    marginBottom: 8,
  },
  key: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyEmpty: {
    backgroundColor: 'transparent',
  },
  keyText: {
    fontSize: 26,
    fontWeight: '400',
    color: '#1C1C1E',
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  cancelText: {
    fontSize: 15,
    color: '#636366',
    fontWeight: '500',
  },
});
