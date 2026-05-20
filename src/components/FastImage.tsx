import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';
import { SkeletonBone } from './SkeletonLoader';

const DEFAULT_BLURHASH = 'L9AS}j00%g%g~qt7WBt7-;WCWBt7';

interface FastImageProps {
  uri: string | null | undefined;
  width: number | `${number}%`;
  height: number | `${number}%`;
  borderRadius?: number;
  contentFit?: ImageContentFit;
  priority?: 'low' | 'normal' | 'high';
  blurhash?: string;
  showSkeleton?: boolean;
}

export const FastImage = React.memo(function FastImage({
  uri,
  width,
  height,
  borderRadius = 0,
  contentFit = 'cover',
  priority = 'normal',
  blurhash = DEFAULT_BLURHASH,
  showSkeleton = true,
}: FastImageProps) {
  const [isLoading, setIsLoading] = useState(!!uri);

  return (
    <View style={{ width: width as any, height: height as any, borderRadius, overflow: 'hidden' }}>
      {isLoading && showSkeleton && (
        <SkeletonBone
          width={width}
          height={height as number}
          borderRadius={borderRadius}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <Image
        source={uri ? { uri } : undefined}
        style={{ width: '100%', height: '100%' }}
        contentFit={contentFit}
        priority={priority}
        placeholder={{ blurhash }}
        transition={{ duration: 200, effect: 'cross-dissolve' }}
        onLoadEnd={() => setIsLoading(false)}
        cachePolicy="memory-disk"
        recyclingKey={uri ?? undefined}
      />
    </View>
  );
});
