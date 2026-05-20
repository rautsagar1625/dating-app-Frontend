import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppBlurView } from './AppBlurView';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../utils/theme';
import { MockUser } from '../utils/mockData';

const { width } = Dimensions.get('window');

interface UserCardProps {
  user: MockUser;
  liked?: boolean;
  onPress?: () => void;
  onLike?: () => void;
  fullScreen?: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  liked = false,
  onPress,
  onLike,
  fullScreen = false,
}) => {
  if (fullScreen) {
    return (
      <TouchableOpacity activeOpacity={0.97} onPress={onPress} style={styles.fullCard}>
        <Image source={{ uri: user.profilePhoto }} style={styles.fullImage} resizeMode="cover" />
        {user.isPhotoPrivate && (
          <AppBlurView intensity={70} tint="dark" style={StyleSheet.absoluteFillObject} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.95)']}
          locations={[0.3, 0.6, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {user.isOnline && (
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        )}
        {user.isPhotoPrivate && (
          <View style={styles.privateTag}>
            <LinearGradient
              colors={COLORS.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.privateTagGradient}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="lock-closed" size={10} color={COLORS.white} />
                <Text style={styles.privateTagText}>Private</Text>
              </View>
            </LinearGradient>
          </View>
        )}
        {user.recommended && !user.isPhotoPrivate && (
          <View style={styles.recommendedTag}>
            <LinearGradient
              colors={COLORS.gradient.gold}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.recommendedTagGradient}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="star" size={10} color={COLORS.white} />
                <Text style={styles.privateTagText}>Top Pick</Text>
              </View>
            </LinearGradient>
          </View>
        )}
        <View style={styles.fullInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.fullName}>{user.name}</Text>
            <Text style={styles.fullAge}>, {user.age}</Text>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.fullLocation}>{user.location}</Text>
          </View>
          <Text style={styles.fullBio} numberOfLines={2}>{user.bio}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, SHADOWS.card]}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: user.profilePhoto }} style={styles.image} resizeMode="cover" />
        {user.isPhotoPrivate && (
          <AppBlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
        )}
        <LinearGradient colors={COLORS.gradient.card} style={StyleSheet.absoluteFillObject} />
        {user.isOnline && <View style={styles.onlineDotSmall} />}
        {user.recommended && (
          <View style={styles.recommendedStarBadge}>
            <LinearGradient
              colors={COLORS.gradient.gold}
              style={styles.recommendedStarGradient}
            >
              <Ionicons name="star" size={10} color={COLORS.white} />
            </LinearGradient>
          </View>
        )}
        {user.isPhotoPrivate && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={14} color={COLORS.white} />
          </View>
        )}
      </View>
      <LinearGradient
        colors={['rgba(123,47,247,0.06)', 'rgba(241,7,163,0.06)']}
        style={styles.cardBody}
      >
        <View style={styles.cardRow}>
          <Text style={styles.cardName} numberOfLines={1}>
            {user.name}, {user.age}
          </Text>
          <TouchableOpacity
            onPress={onLike}
            style={[styles.likeBtn, liked && styles.likeBtnActive]}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={14}
              color={liked ? COLORS.pink : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
          <Text style={styles.cardLocation} numberOfLines={1}>{user.location}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const CARD_WIDTH = (width - SPACING.md * 2 - SPACING.sm) / 2;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    marginBottom: SPACING.sm,
  },
  imageWrapper: {
    width: '100%',
    height: CARD_WIDTH * 1.3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  onlineDotSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
    borderWidth: 1.5,
    borderColor: COLORS.card,
  },
  lockBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: RADIUS.full,
    padding: 4,
  },
  cardBody: {
    padding: SPACING.sm,
    gap: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    flex: 1,
  },
  likeBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeBtnActive: {
    backgroundColor: 'rgba(241,7,163,0.2)',
  },
  cardLocation: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },

  // Full-screen card
  fullCard: {
    flex: 1,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  fullImage: {
    ...StyleSheet.absoluteFillObject,
  },
  onlineBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 5,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  onlineText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  privateTag: {
    position: 'absolute',
    top: 20,
    left: 20,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  privateTagGradient: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  privateTagText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  recommendedTag: {
    position: 'absolute',
    top: 20,
    left: 20,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  recommendedTagGradient: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  recommendedStarBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  recommendedStarGradient: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.xl,
    gap: SPACING.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  fullName: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xxxl,
    fontWeight: '800',
  },
  fullAge: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fullLocation: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  fullBio: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
    marginTop: 2,
  },
});
