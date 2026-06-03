import { Text } from "@components/ui/Text";
import { Brand, Shadow, Space, TextColor } from "@constants/index";
import { haptic } from "@lib/haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "react-native-vector-icons/Feather";

const ICONS: Record<string, string> = {
  Home: "home",
  Attendance: "check-square",
  MyClasses: "book-open",
  MyClass: "users",
  Chat: "message-circle",
  Profile: "user",
};
const LABELS: Record<string, string> = {
  Home: "Home",
  Attendance: "Attend",
  MyClasses: "Classes",
  MyClass: "My Class",
  Chat: "Chat",
  Profile: "Profile",
};

const APPROX_W = 390;

export function NavTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const count = state.routes.length;
  const itemW = count > 0 ? APPROX_W / count : APPROX_W;
  const indicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: state.index * itemW + itemW / 2 - 16,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [state.index, itemW, indicatorX]);

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, Space.sm) },
        Shadow.md,
      ]}
    >
      <Animated.View
        style={[styles.indicator, { transform: [{ translateX: indicatorX }] }]}
      />
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          const e = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          haptic.light();
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={LABELS[route.name] ?? route.name}
            onPress={onPress}
            onLongPress={() =>
              navigation.emit({ type: "tabLongPress", target: route.key })
            }
            activeOpacity={0.8}
            style={styles.item}
          >
            <Feather
              name={ICONS[route.name] ?? "circle"}
              size={focused ? 23 : 21}
              color={focused ? Brand.neural : TextColor.lightSecondary}
            />
            <Text
              variant="label"
              color={focused ? Brand.neural : TextColor.lightSecondary}
              style={styles.label}
            >
              {LABELS[route.name] ?? route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF", // Clean white
    paddingTop: 8,
    paddingBottom: 24, // Account for safe area
    position: "absolute", // Float it
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
  indicator: {
    position: "absolute",
    top: 0,
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1E40AF", // NeuraLife Primary Blue
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    gap: 4,
  },
  label: { fontSize: 10, letterSpacing: 0.2, fontWeight: "600" },
});
