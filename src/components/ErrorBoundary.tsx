import React, { Component, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { ENV } from '../config/env';

interface Props {
  children:   ReactNode;
  fallback?:  ReactNode;
  onError?:   (error: Error, info: React.ErrorInfo) => void;
  level?:     'screen' | 'global';
}

interface State {
  hasError: boolean;
  error:    Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
    if (ENV.isProd) {
      // Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    }
    if (ENV.isDev) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  recover = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const { level = 'screen', } = this.props;

    return (
      <View style={styles.root}>
        <LinearGradient
          colors={['#1A0A2E', '#0F0F0F']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons name="warning" size={48} color={COLORS.error} />
          </View>
          <Text style={styles.title}>
            {level === 'global' ? 'Something went wrong' : 'This section crashed'}
          </Text>
          <Text style={styles.subtitle}>
            {level === 'global'
              ? 'The app ran into an unexpected error. Tap below to try again.'
              : 'An error occurred. You can try refreshing this section.'}
          </Text>
          {ENV.isDev && this.state.error && (
            <ScrollView style={styles.errorBox} showsVerticalScrollIndicator={false}>
              <Text style={styles.errorText}>{this.state.error.message}</Text>
            </ScrollView>
          )}
          <TouchableOpacity style={[styles.btn, SHADOWS.glow]} onPress={this.recover}>
            <LinearGradient
              colors={COLORS.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Ionicons name="refresh" size={18} color={COLORS.white} />
              <Text style={styles.btnText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    maxWidth: 360,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,69,58,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  errorBox: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    maxHeight: 120,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.error,
    fontFamily: 'Courier',
    fontSize: FONTS.sizes.xs,
  },
  btn: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  btnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
});
