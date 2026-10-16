import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../hooks/useTheme";
import { Spacing, Typography } from "../../constants/theme";

export default function AuthCallback() {
  const { theme } = useTheme();
  const params = useLocalSearchParams();

  useEffect(() => {
    async function handleAuthRedirect() {
      try {
        // 1. Check if tokens are passed via search params (code or tokens)
        const access_token = (params.access_token as string) || "";
        const refresh_token = (params.refresh_token as string) || "";

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (!error) {
            router.replace("/(tabs)");
            return;
          }
        }

        // 2. Fallback: Parse URL from Linking.getInitialURL() or window.location for hash (#access_token=...)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl.includes("#")) {
          const hashString = initialUrl.split("#")[1];
          const hashParams = new URLSearchParams(hashString);
          const hashAccessToken = hashParams.get("access_token");
          const hashRefreshToken = hashParams.get("refresh_token");

          if (hashAccessToken && hashRefreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken,
            });
            if (!error) {
              router.replace("/(tabs)");
              return;
            }
          }
        }

        // 3. Fallback: Check if Supabase session is already established by WebBrowser auth listener
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          router.replace("/(tabs)");
        } else {
          router.replace("/auth");
        }
      } catch (e) {
        console.warn("[AuthCallback] Error handling callback:", e);
        router.replace("/auth");
      }
    }

    handleAuthRedirect();
  }, [params]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.green} />
      <Text style={[styles.text, { color: theme.textMuted }]}>Đang hoàn tất đăng nhập...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  text: {
    fontSize: Typography.callout.fontSize,
    fontWeight: Typography.weight.semibold,
  },
});
