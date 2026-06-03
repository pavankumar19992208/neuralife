// apps/mobile/src/constants/colors.ts
export const Colors = {
  // Base colors (Clean, daylight-readable for classrooms)
  bg: "#F8FAFC", // Near white / slate 50
  surface: "#FFFFFF", // Clean white cards
  surfaceHigh: "#F1F5F9", // Slightly elevated surface

  // Text colors
  textPrimary: "#0F172A", // Near black (sharp contrast)
  textSecondary: "#64748B", // Muted secondary text
  textMuted: "#94A3B8",

  // Brand colors
  primary: "#1E40AF", // Deep blue - Trust, Intelligence
  secondary: "#0D9488", // Teal - Growth, Learning
  accent: "#F59E0B", // Amber - Alerts, Attention

  // Status colors
  success: "#10B981", // Mastery, Achievement
  warning: "#F59E0B", // Watch, Declining
  danger: "#EF4444", // AT_RISK, Urgent
  info: "#3B82F6",

  // Subject colors (Softer pastel variants for light mode)
  math: "#DBEAFE", // light blue
  science: "#D1FAE5", // light emerald
  english: "#FEF3C7", // light amber
  telugu: "#FEE2E2", // light red
  social: "#EDE9FE", // light violet
  biology: "#ECFCCB", // light lime
  hindi: "#FCE7F3", // light pink
  physics: "#E0F2FE", // light sky
  chemistry: "#FFEDD5", // light orange

  // Attendance colors
  present: "#10B981",
  late: "#F59E0B",
  absent: "#EF4444",

  // System colors
  overlay: "rgba(15, 23, 42, 0.4)",
  cardBorder: "#E2E8F0", // Clean structural border
} as const;

export type ColorName = keyof typeof Colors;
