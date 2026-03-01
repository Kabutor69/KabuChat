/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Background colors
        background: "#FFFFFF",
        surface: "#F8F9FA",
        "surface-elevated": "#FFFFFF",

        // Primary brand color
        primary: {
          DEFAULT: "#6366F1",
          light: "#818CF8",
          dark: "#4F46E5",
        },

        // Accent colors
        accent: {
          DEFAULT: "#8B5CF6",
          light: "#A78BFA",
          secondary: "#06B6D4",
        },

        // Text colors
        foreground: {
          DEFAULT: "#111827",
          muted: "#6B7280",
          subtle: "#9CA3AF",
        },

        // Border colors
        border: {
          DEFAULT: "#E5E7EB",
          light: "#F3F4F6",
        },

        // Status colors
        success: "#10B981",
        error: "#EF4444",
        warning: "#F59E0B",
      },
    },
  },
  plugins: [],
};
