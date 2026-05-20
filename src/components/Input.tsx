import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
  inputHeight?: number;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  rightIcon,
  containerStyle,
  isPassword = false,
  secureTextEntry,
  multiline,
  inputHeight,
  style,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const wrapperHeightStyle = multiline
    ? { minHeight: inputHeight ?? 80, alignItems: 'flex-start' as const, paddingVertical: 10 }
    : { height: 54 };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.borderWrapper}>
        {isFocused ? (
          <LinearGradient
            colors={COLORS.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBorder}
          >
            <View style={[styles.inputWrapper, wrapperHeightStyle, error ? styles.errorBorder : null]}>
              <TextInput
                style={[styles.input, multiline && styles.inputMultiline, style]}
                placeholderTextColor={COLORS.textMuted}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                secureTextEntry={isPassword ? !showPassword : secureTextEntry}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
                {...rest}
              />
              {isPassword && (
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.iconBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
              {rightIcon && !isPassword && <View style={styles.iconBtn}>{rightIcon}</View>}
            </View>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.inputWrapper,
              styles.unfocusedBorder,
              wrapperHeightStyle,
              error ? styles.errorBorder : null,
            ]}
          >
            <TextInput
              style={[styles.input, multiline && styles.inputMultiline, style]}
              placeholderTextColor={COLORS.textMuted}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              secureTextEntry={isPassword ? !showPassword : secureTextEntry}
              multiline={multiline}
              textAlignVertical={multiline ? 'top' : 'center'}
              {...rest}
            />
            {isPassword && (
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.iconBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
            {rightIcon && !isPassword && <View style={styles.iconBtn}>{rightIcon}</View>}
          </View>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginBottom: SPACING.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  borderWrapper: {
    borderRadius: RADIUS.lg,
  },
  gradientBorder: {
    padding: 1.5,
    borderRadius: RADIUS.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
  },
  unfocusedBorder: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  errorBorder: { borderColor: COLORS.error },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    height: '100%',
    paddingVertical: 0,
  },
  inputMultiline: {
    height: undefined,
    paddingVertical: SPACING.xs,
  },
  iconBtn: { paddingLeft: SPACING.sm, alignSelf: 'center' },
  error: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xs,
  },
});
