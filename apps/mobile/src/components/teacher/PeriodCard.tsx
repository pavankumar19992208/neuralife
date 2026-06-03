import type {
  PeriodCard as PeriodCardType,
  PeriodStatus,
} from "@apptypes/home";
import { Badge } from "@components/ui/Badge";
import { Text } from "@components/ui/Text";
import { subjectColor } from "@constants/index";
import { useStaggerAnimation } from "@hooks/useEntryAnimation";
import { Palette, Surface, Shadow, Border } from "@constants/theme";
import { Typography } from "@constants/typography";
import { haptic } from "@lib/haptics";
import { rv } from "@lib/responsive";
import React, { useEffect, useRef } from "react";
import {
  Animated as RNAnimated,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface Props {
  period: PeriodCardType;
  status: PeriodStatus;
  elapsedPct: number;
  index: number;
  onPress: (period: PeriodCardType) => void;
}

function NowPulseDot({ color }: { color: string }) {
  const scale = useRef(new RNAnimated.Value(1)).current;
  const opacity = useRef(new RNAnimated.Value(0.8)).current;

  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.parallel([
          RNAnimated.timing(scale, {
            toValue: 1.7,
            duration: 750,
            useNativeDriver: true,
          }),
          RNAnimated.timing(opacity, {
            toValue: 0,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
        RNAnimated.parallel([
          RNAnimated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          RNAnimated.timing(opacity, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <View style={dot.wrap}>
      <RNAnimated.View
        style={[
          dot.outer,
          { backgroundColor: color, transform: [{ scale }], opacity },
        ]}
      />
      <View style={[dot.inner, { backgroundColor: color }]} />
    </View>
  );
}

const dot = StyleSheet.create({
  wrap: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  outer: { position: "absolute", width: 14, height: 14, borderRadius: 7 },
  inner: { width: 7, height: 7, borderRadius: 4 },
});

const formatTime = (timeStr?: string) => {
  if (!timeStr) return "";
  // Splits "HH:mm:ss" and keeps only "HH:mm"
  return timeStr.split(":").slice(0, 2).join(":");
};

export const PeriodCard = React.memo(function PeriodCard({
  period,
  status,
  elapsedPct,
  index,
  onPress,
}: Props) {
  const { animatedStyle: stagger } = useStaggerAnimation(index);
  const progressWidth = useSharedValue(0);

  const isRegular = period.periodType === "REGULAR";
  const isNonTeaching = !isRegular;
  const rawColor = subjectColor(period.subject);

  const isNow = status === "NOW";
  const isPast = status === "PAST";
  const isUpcoming = status === "UPCOMING";

  useEffect(() => {
    progressWidth.value = withTiming(isNow ? elapsedPct : isPast ? 100 : 0, {
      duration: 800,
    });
  }, [elapsedPct, isNow, isPast, progressWidth]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as `${number}%`,
  }));

  // Non-teaching periods (Breaks, Assembly) styling
  if (isNonTeaching) {
    const label =
      period.periodType === "BREAK"
        ? "· · ·  Short Break  · · ·"
        : period.periodType === "LUNCH"
          ? "🍛  Lunch Break"
          : period.periodType === "ASSEMBLY"
            ? "🏫  Morning Assembly"
            : period.periodType === "LIBRARY"
              ? "📚  Library"
              : "Free";
    return (
      <View style={styles.slim}>
        <Text style={styles.slimTime}>{formatTime(period.startTime)}</Text>
        <Text style={styles.slimLabel}>{label}</Text>
      </View>
    );
  }

  // --- Neural Intelligence OS Theme Values ---
  // NOW: Neural Blue with glass effect. Otherwise: Clean white card with professional borders.
  const cardBg = isNow ? Palette.neuralBlue : Surface.cardLight;
  const cardBorder = isNow ? Palette.neuralBlue : Border.lightDefault;
  const textColor = isNow ? Palette.white : Palette.black;
  const subTextColor = isNow ? "rgba(255,255,255,0.85)" : "rgba(15,23,42,0.65)";
  const timeLineColor = isNow ? "rgba(255,255,255,0.25)" : rawColor + "35";

  // The left neural intelligence strip
  const leftBar = isNow ? Palette.academicGold : rawColor; // Academic gold for NOW, else subject color
  const cardOpacity = isPast ? 0.65 : 1;

  return (
    <Animated.View style={stagger}>
      <TouchableOpacity
        onPress={() => {
          haptic.light();
          onPress(period);
        }}
        activeOpacity={0.8}
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            opacity: cardOpacity,
          },
          // Enhanced neural intelligence shadow for active period
          isNow && {
            ...Shadow.lg,
            shadowColor: Palette.neuralBlue,
            shadowOpacity: 0.25,
          },
        ]}
      >
        {/* Left accent bar */}
        <View style={[styles.leftBar, { backgroundColor: leftBar }]} />

        {/* Time column */}
        <View
          style={[
            styles.timeCol,
            { borderRightColor: isNow ? "rgba(255,255,255,0.12)" : Border.lightDefault },
          ]}
        >
          <Text style={[styles.startTime, { color: textColor }]}>
            {/* Wrap period.startTime with formatTime */}
            {formatTime(period.startTime)}
          </Text>
          <View style={[styles.timeLine, { backgroundColor: timeLineColor }]} />
          <Text style={[styles.endTime, { color: subTextColor }]}>
            {/* Wrap period.endTime with formatTime */}
            {formatTime(period.endTime)}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.subjectRow}>
            <Text
              style={[styles.subject, { color: textColor }]}
              numberOfLines={1}
            >
              {period.subject.replace(/_/g, " ")}
            </Text>
            {isNow && <NowPulseDot color={Palette.academicGold} />}
          </View>
          <Text
            style={[styles.classInfo, { color: subTextColor }]}
            numberOfLines={1}
          >
            Class {period.classYear}-{period.section}
            {period.roomNumber ? ` · Room ${period.roomNumber}` : ""}
          </Text>
          <Text style={[styles.studentCount, { color: subTextColor }]}>
            {period.studentCount} students
          </Text>
          {period.isSubstitute && (
            <Badge
              label="Substitute"
              variant="warning"
              style={{ marginTop: 6 }}
            />
          )}
        </View>

        {/* Status column */}
        <View style={styles.statusCol}>
          {isNow && (
            <View style={styles.nowPill}>
              <Text style={styles.nowText}>NOW</Text>
            </View>
          )}
          {isPast && (
            <Text
              style={[
                styles.statusIcon,
                {
                  color: period.coverageMarked
                    ? Palette.successGreen
                    : "rgba(15,23,42,0.3)",
                },
              ]}
            >
              {period.coverageMarked ? "✓" : "○"}
            </Text>
          )}
          {isUpcoming && (
            <Text style={[styles.statusIcon, { color: "rgba(15,23,42,0.4)" }]}>◷</Text>
          )}
        </View>

        {/* Progress bar (NOW) */}
        {isNow && (
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: Palette.academicGold }, // Neural Intelligence Academic Gold
                progressBarStyle,
              ]}
            />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: rv(16, 24),
    marginBottom: 14,
    borderRadius: 18, // Enhanced radius for professional look
    borderWidth: 1.5,
    flexDirection: "row",
    overflow: "hidden",
    minHeight: 92,
    ...Shadow.md, // Professional depth
  },
  leftBar: {
    width: 6,
    alignSelf: "stretch",
  },
  timeCol: {
    width: 65,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRightWidth: 1,
  },
  startTime: {
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  endTime: {
    fontSize: 11,
    fontFamily: "monospace",
    opacity: 0.8,
  },
  timeLine: { flex: 1, width: 2, marginVertical: 6, borderRadius: 2 },
  content: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 3,
    justifyContent: "center",
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  subject: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  classInfo: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  studentCount: {
    fontSize: 12,
    fontWeight: "400",
    opacity: 0.8,
  },
  statusCol: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 12,
  },
  nowPill: {
    backgroundColor: Palette.academicGold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    ...Shadow.sm,
  },
  nowText: {
    fontSize: 9,
    fontWeight: "800",
    color: Palette.white,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  statusIcon: { fontSize: 18, fontWeight: "600" },
  progressTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  progressFill: { height: 4, borderRadius: 4 },

  // Non-teaching slim row styling
  slim: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: rv(16, 24),
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Surface.cardLightHigh,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Border.lightDefault,
    ...Shadow.sm,
  },
  slimTime: {
    width: 58,
    fontSize: 12,
    fontFamily: "monospace",
    color: Palette.neuralBlue,
    fontWeight: "600",
    textAlign: "center",
    opacity: 0.8,
  },
  slimLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(15,23,42,0.7)",
    letterSpacing: 0.2,
    lineHeight: 18,
  },
});
