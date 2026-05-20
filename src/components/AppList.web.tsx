// Web: FlatList wrapper that accepts FlashList props but ignores native-only ones
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { FlatList, FlatListProps } from 'react-native';

export interface AppListRef<T = unknown> {
  scrollToEnd:   (params?: { animated?: boolean }) => void;
  scrollToIndex: (params: { index: number; animated?: boolean; viewOffset?: number; viewPosition?: number }) => void;
  scrollToOffset:(params: { offset: number; animated?: boolean }) => void;
}

export interface AppListProps<T> extends FlatListProps<T> {
  estimatedItemSize?: number;
  getItemType?:        (item: T, index: number, extraData?: unknown) => string | number;
  overrideItemLayout?: unknown;
  drawDistance?:       number;
}

function AppListInner<T>(
  { estimatedItemSize: _e, getItemType: _g, overrideItemLayout: _o, drawDistance: _d, ...rest }: AppListProps<T>,
  ref: React.ForwardedRef<AppListRef<T>>,
) {
  const listRef = useRef<FlatList<T>>(null);

  useImperativeHandle(ref, () => ({
    scrollToEnd:   (p) => listRef.current?.scrollToEnd(p),
    scrollToIndex: (p) => listRef.current?.scrollToIndex(p),
    scrollToOffset:(p) => listRef.current?.scrollToOffset(p),
  }));

  return <FlatList<T> {...rest} ref={listRef} />;
}

export const AppList = forwardRef(AppListInner) as <T>(
  props: AppListProps<T> & { ref?: React.Ref<AppListRef<T>> },
) => React.ReactElement | null;
