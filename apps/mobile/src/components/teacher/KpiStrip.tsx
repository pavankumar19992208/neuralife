import type { KpiData } from "@apptypes/home";
import { Text } from "@components/ui/Text";
import { useStaggerAnimation } from "@hooks/useEntryAnimation";
import { haptic } from "@lib/haptics";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";

interface KpiTileProps {
  value: string;
  label: string;
  alertState?: "danger" | "warning" | "success" | "ai-pending" | null;
  onPress?: () => void;
  index: number;
}

function KpiTile({ value, label, alertState, onPress, index }: KpiTileProps) {
  const { animatedStyle } = useStaggerAnimation(index);

  // New Theme Colors
  const dangerColor = "#EF4444"; // Red
  const warningColor = "#F59E0B"; // Amber
  const successColor = "#10B981"; // Green
  const brandBlue = "#1E40AF"; // NeuraLife Blue

  const accent =
    alertState === "danger"
      ? dangerColor
      : alertState === "warning"
        ? warningColor
        : alertState === "success"
          ? successColor
          : null;

  // Let the number pop in brand blue if no accent, otherwise use the accent color
  const valueColor =
    accent ?? (alertState === "ai-pending" ? "#94A3B8" : brandBlue);

  // Softer background if it has an alert to draw attention subtly
  const tileBg = accent
    ? alertState === "danger"
      ? "rgba(254, 242, 242, 0.85)" // frosted red
      : alertState === "warning"
        ? "rgba(255, 251, 235, 0.85)" // frosted amber
        : "rgba(236, 253, 245, 0.85)" // frosted green
    : "rgba(255, 255, 255, 0.65)";

  const tileBorder = "rgba(255, 255, 255, 0.5)";
  return (
    <Animated.View style={[styles.cell, animatedStyle]}>
      <TouchableOpacity
        onPress={
          onPress
            ? () => {
                haptic.light();
                onPress();
              }
            : undefined
        }
        activeOpacity={onPress ? 0.7 : 1}
        style={[
          styles.tile,
          { backgroundColor: tileBg, borderColor: tileBorder },
        ]}
        accessibilityLabel={`${label}: ${value}`}
      >
        {/* Status Dot */}
        {accent ? (
          <View style={[styles.dot, { backgroundColor: accent }]} />
        ) : null}

        {/* AI Processing Pill */}
        {alertState === "ai-pending" ? (
          <View style={styles.aiPill}>
            <Text style={styles.aiText}>AI</Text>
          </View>
        ) : null}

        {/* The Value */}
        <Text style={[styles.value, { color: valueColor }]}>{value}</Text>

        {/* The Label */}
        <Text style={[styles.label, { color: "#64748B" }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface Props {
  kpis: KpiData;
  isClassTeacher: boolean;
  accentColor: string;
  onHwPress?: () => void;
  onDoubtsPress?: () => void;
  onAbsentPress?: () => void;
  onLeavePress?: () => void;
}

export const KpiStrip = React.memo(function KpiStrip({
  kpis,
  isClassTeacher,
  onHwPress,
  onDoubtsPress,
  onAbsentPress,
  onLeavePress,
}: Props) {
  const tiles: KpiTileProps[] = [
    {
      index: 0,
      value: String(kpis.periodsToday),
      label: "PERIODS",
      alertState: null,
    },
    {
      index: 1,
      value: String(kpis.homeworkDueToday),
      label: "HW DUE",
      alertState:
        kpis.homeworkCompletionPct !== null && kpis.homeworkCompletionPct < 60
          ? "warning"
          : null,
      onPress: onHwPress,
    },
    {
      index: 2,
      value: kpis.doubtsPending > 0 ? String(kpis.doubtsPending) : "—",
      label: "DOUBTS",
      alertState: kpis.doubtsPending > 5 ? "danger" : null,
      onPress: kpis.doubtsPending > 0 ? onDoubtsPress : undefined,
    },
    {
      index: 3,
      value: kpis.atRiskCount === null ? "—" : String(kpis.atRiskCount),
      label: "AT-RISK",
      alertState:
        kpis.atRiskCount === null
          ? "ai-pending"
          : kpis.atRiskCount > 0
            ? "danger"
            : null,
    },
  ];

  if (isClassTeacher) {
    tiles.push(
      {
        index: 4,
        value:
          kpis.presentToday !== undefined ? String(kpis.presentToday) : "—",
        label: "PRESENT",
        alertState: (kpis.presentToday ?? 0) > 0 ? "success" : null,
      },
      {
        index: 5,
        value: kpis.absentToday !== undefined ? String(kpis.absentToday) : "—",
        label: "ABSENT",
        alertState: (kpis.absentToday ?? 0) > 3 ? "danger" : null,
        onPress: onAbsentPress,
      },
      {
        index: 6,
        value:
          kpis.leaveRequestsPending !== undefined
            ? String(kpis.leaveRequestsPending)
            : "—",
        label: "LEAVE REQ",
        alertState: (kpis.leaveRequestsPending ?? 0) > 0 ? "warning" : null,
        onPress: onLeavePress,
      },
    );
  }

  return (
    <View style={styles.grid}>
      {tiles.map((t) => (
        <KpiTile key={t.label} {...t} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
    justifyContent: "flex-start",
  },
  cell: {
    width: "31%", // Fits 3 in a row nicely with gap spacing
  },
  tile: {
    height: 76,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    // Add subtle shadow to elevate the frosted glass
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  value: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    fontFamily: "monospace",
    marginBottom: 2,
  },
  label: {
    textAlign: "center",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  dot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  aiPill: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#DBEAFE",
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  aiText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#1E40AF",
  },
});
