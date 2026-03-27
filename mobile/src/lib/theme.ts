import { Dimensions } from "react-native";
// import { DeepPartial, Theme } from "stream-chat-expo";
// import type { DeepPartial, Theme } from "stream-chat-expo";

const { width } = Dimensions.get("window");
const vw = (percent: number) => (width * percent) / 100;

// these colors are matching tailwind.config.js
export const COLORS = {
  // Primary brand color - more vibrant
  primary: "#5B4AFF",
  primaryDark: "#4A39FF",
  primaryLight: "#7B6AFF",
  primaryTransparent: "rgba(91, 74, 255, 0.5)",

  // Background colors
  background: "#FAFBFC",
  surface: "#F0F3F8",
  surfaceDark: "#1A1F2E",
  surfaceLight: "#FFFFFF",

  // Text colors
  text: "#0A0E18",
  textMuted: "#6B7683",
  textSubtle: "#8A949F",

  // Border colors
  border: "#E0E5EE",
  borderLight: "#EBF0F7",

  // Status colors
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",

  // Active/Interactive
  active: "#5B4AFF",

  // Chat bubbles
  outgoingBubble: "#5B4AFF",
  incomingBubble: "#FFFFFF",
  chatBackground: "#FAFBFC",

  // Accent colors
  accent: "#9B5AFF",
  accentSecondary: "#00D9FF",
};
