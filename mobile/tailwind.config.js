/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Background colors - softer, more refined
        background: "#FAFBFC",
        "background-dark": "#0F1419",
        surface: "#F0F3F8",
        "surface-dark": "#1A1F2E",
        "surface-elevated": "#FFFFFF",
        "surface-elevated-dark": "#252D3D",

        // Primary brand color - more vibrant
        primary: {
          DEFAULT: "#5B4AFF",
          light: "#7B6AFF",
          dark: "#4A39FF",
        },

        // Accent colors - richer
        accent: {
          DEFAULT: "#9B5AFF",
          light: "#BB7AFF",
          secondary: "#00D9FF",
        },

        // Text colors - better contrast
        foreground: {
          DEFAULT: "#0A0E18",
          dark: "#E8ECFF",
          muted: "#6B7683",
          "muted-dark": "#A0A9BD",
          subtle: "#8A949F",
          "subtle-dark": "#7A8495",
        },

        // Border colors - more defined
        border: {
          DEFAULT: "#E0E5EE",
          dark: "#1F2636",
          light: "#EBF0F7",
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
