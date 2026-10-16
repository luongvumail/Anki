import React, { useState, useEffect } from "react";
import { Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, Typography, Layout } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { flushOfflineQueue } from "../../lib/offlineQueue";

export const OfflineBanner = React.memo(function OfflineBanner() {
  const { theme } = useTheme();
  const [isOffline, setIsOffline] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    // Try @react-native-community/netinfo if present
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const NetInfo = require("@react-native-community/netinfo");
      if (NetInfo && typeof NetInfo.addEventListener === "function") {
        unsubscribe = NetInfo.addEventListener((state: { isConnected: boolean | null }) => {
          const offline = state.isConnected === false;
          setIsOffline(offline);
          if (!offline) {
            flushOfflineQueue();
          }
        });
      }
    } catch {
      // Fallback for Web or environments without NetInfo
      const handleOnline = () => {
        setIsOffline(false);
        flushOfflineQueue();
      };
      const handleOffline = () => setIsOffline(true);

      if (typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        if (typeof navigator !== "undefined" && "onLine" in navigator) {
          setIsOffline(!navigator.onLine);
        }
        unsubscribe = () => {
          window.removeEventListener("online", handleOnline);
          window.removeEventListener("offline", handleOffline);
        };
      }
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, slideAnim]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: theme.red, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={Layout.iconSm} color="#FFFFFF" />
      <Text style={styles.bannerText}>Chế độ ngoại tuyến (Offline) — Đang lưu dữ liệu tại máy</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.pageMargin,
  },
  bannerText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.extraBold,
    color: "#FFFFFF",
  },
});
