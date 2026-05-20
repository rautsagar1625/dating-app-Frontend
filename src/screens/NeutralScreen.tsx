import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  StatusBar,
  Animated,
  Vibration,
  Dimensions,
} from 'react-native';
import { PinPad } from '../components/PinPad';
import { useQuickExitStore } from '../store/quickExitStore';

const { height } = Dimensions.get('window');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FAKE_HEADLINES = [
  'Markets close higher amid positive economic data',
  'Tech companies report strong quarterly earnings',
  'New climate agreement reached at summit',
  'Scientists discover new deep-sea species',
  'City council approves infrastructure budget',
  'Local sports team wins regional championship',
];

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function NeutralScreen() {
  const { pin, unlock } = useQuickExitStore();
  const now = useClock();

  const [showPinPad, setShowPinPad] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(height)).current;

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const dayName = DAYS[now.getDay()];
  const dateStr = `${dayName}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  const openPinPad = useCallback(() => {
    setShowPinPad(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [slideAnim]);

  const closePinPad = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setShowPinPad(false);
      setPinError(null);
    });
  }, [slideAnim]);

  const handleLongPress = () => {
    Vibration.vibrate(40);
    if (!pin) {
      unlock();
    } else {
      openPinPad();
    }
  };

  const handlePinComplete = (entered: string) => {
    if (entered === pin) {
      closePinPad();
      setTimeout(unlock, 280);
    } else {
      Vibration.vibrate([0, 50, 50, 50]);
      setPinError('Incorrect PIN');
      setTimeout(() => setPinError(null), 1200);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

      {/* Clock area — long press to unlock */}
      <TouchableOpacity
        style={styles.clockArea}
        onLongPress={handleLongPress}
        delayLongPress={600}
        activeOpacity={1}
      >
        <Text style={styles.time}>{hours}:{minutes}</Text>
        <Text style={styles.date}>{dateStr}</Text>
        <Text style={styles.weather}>Mumbai  24°  ⛅</Text>
      </TouchableOpacity>

      {/* Fake news feed */}
      <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
        <Text style={styles.feedLabel}>TODAY</Text>
        {FAKE_HEADLINES.map((headline, i) => (
          <View key={i} style={styles.newsItem}>
            <View style={styles.newsThumb} />
            <View style={styles.newsText}>
              <Text style={styles.newsSource}>News · {i + 1}h ago</Text>
              <Text style={styles.newsHeadline} numberOfLines={2}>{headline}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Hint text */}
      <View style={styles.hintRow}>
        <Text style={styles.hintText}>Hold the clock to return</Text>
      </View>

      {/* PIN pad slide-up sheet */}
      {showPinPad && (
        <View style={[StyleSheet.absoluteFillObject, { pointerEvents: 'box-none' }]}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={closePinPad}
          />
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: slideAnim }], pointerEvents: 'auto' }]}
          >
            <View style={styles.sheetHandle} />
            <PinPad
              title="Enter PIN to continue"
              onComplete={handlePinComplete}
              onCancel={closePinPad}
              errorMessage={pinError}
            />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },

  clockArea: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 32,
    backgroundColor: '#F2F2F7',
  },
  time: {
    fontSize: 80,
    fontWeight: '200',
    color: '#1C1C1E',
    letterSpacing: -2,
    lineHeight: 88,
  },
  date: {
    fontSize: 17,
    color: '#636366',
    fontWeight: '400',
    marginTop: 4,
  },
  weather: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 8,
    fontWeight: '400',
  },

  feed: {
    flex: 1,
    paddingHorizontal: 16,
  },
  feedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  newsItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
  },
  newsThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#D1D1D6',
    flexShrink: 0,
  },
  newsText: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  newsSource: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  newsHeadline: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
    lineHeight: 19,
  },

  hintRow: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#F2F2F7',
  },
  hintText: {
    fontSize: 11,
    color: '#C7C7CC',
    fontWeight: '400',
    letterSpacing: 0.3,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
});
