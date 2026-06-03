import type { AlertItem as AlertItemType } from "@apptypes/home";
import { Text } from "@components/ui/Text";
import { useStaggerAnimation } from "@hooks/useEntryAnimation";
import { haptic } from "@lib/haptics";
import { rv } from "@lib/responsive";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";

interface Props {
  alert: AlertItemType;
  index: number;
  onPress: (alert: AlertItemType) => void;
}

const TYPE_ICON: Record<string, string> = {
  ABSENCE_STREAK: "🔴",
  HOMEWORK_NOT_SUBMITTED: "📋",
  DOUBT_OVERFLOW: "❓",
};

export const AlertItem = React.memo(function AlertItem({
  alert,
  index,
  onPress,
}: Props) {
  const { animatedStyle } = useStaggerAnimation(index);

  // Use our new theme colors
  const dangerColor = "#EF4444";
  const warningColor = "#F59E0B";
  const borderColor = alert.severity === "HIGH" ? dangerColor : warningColor;

  const icon = TYPE_ICON[alert.type] ?? "⚠️";

  const handlePress = () => {
    haptic.light();
    onPress(alert);
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[styles.card, { borderLeftColor: borderColor }]}
      >
        <Text style={styles.icon}>{icon}</Text>

        <View style={styles.body}>
          <Text style={styles.message} numberOfLines={2}>
            {alert.message}
          </Text>
          {alert.studentName && (
            <Text style={styles.studentName}>{alert.studentName}</Text>
          )}
        </View>

        <Text style={[styles.action, { color: borderColor }]}>
          {alert.actionLabel}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: rv(16, 24),
    marginBottom: 8,
    // Frosted glass background to blend with screen gradient
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderLeftWidth: 4,
    padding: 12,
    gap: 12,
    shadowColor: "#1E40AF",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  icon: { fontSize: 16 },
  body: { flex: 1, gap: 2, justifyContent: "center" },
  message: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.1,
  },
  studentName: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  action: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
    minWidth: 72,
    textTransform: "uppercase",
  },
});
