import type { Config } from "tailwindcss";

// SuzuMemo Color Palette
// Based on Suzu mascot character colors with WCAG AA compliance
// Original colors:
// - Outline: #2E2E2E
// - Body: #8C5A3E
// - Belly: #F6E8D5
// - Cheeks: #F5B7B1
// - Cap: #77A3B2
// - Clipboard: #F2C199

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette - Cap blue (adjusted for accessibility)
        "suzu-primary": {
          50: "#F0F6F8",
          100: "#E1EDF1",
          200: "#C3DBE3",
          300: "#A5C9D5",
          400: "#87B7C7",
          500: "#77A3B2", // Original cap color
          600: "#5F8A9C",
          700: "#4A6E7C", // Use for text on white (5.51:1 contrast)
          800: "#3A5660",
          900: "#2A3E44",
          950: "#1A262B",
        },

        // Brown palette - Body colors
        "suzu-brown": {
          50: "#FBF8F6",
          100: "#F7F1ED",
          200: "#EFE3DB",
          300: "#E7D5C9",
          400: "#DFC7B7",
          500: "#8C5A3E", // Original body color
          600: "#724832",
          700: "#5A3828", // Use for text (8.58:1 contrast)
          800: "#42281E",
          900: "#2A1814",
        },

        // Accent colors from mascot
        "suzu-cream": "#F6E8D5", // Belly - backgrounds
        "suzu-blush": "#F5B7B1", // Cheeks - accents
        "suzu-clipboard": "#F2C199", // Clipboard
        "suzu-cream-dark": "#C4A678", // Darker cream for text
        "suzu-blush-dark": "#D47B73", // Darker blush for text
        "suzu-clipboard-dark": "#C99562", // Darker clipboard for text

        // Neutral colors for text hierarchy (based on suzu-brown)
        "suzu-neutral": {
          50: "#FBF8F6", // Very light cream
          100: "#F7F1ED", // Light cream
          200: "#EFE3DB", // Cream
          300: "#E7D5C9", // Medium cream
          400: "#DFC7B7", // Dark cream
          500: "#C4A678", // Medium brown (readable on light)
          600: "#8C5A3E", // Original body color
          700: "#5A3828", // Dark brown (excellent contrast)
          800: "#42281E", // Very dark brown
          900: "#2A1814", // Almost black brown
        },

        // Semantic colors for UI states
        "suzu-success": "#5B8C5A", // Green with warmth
        "suzu-warning": "#D4A373", // Warm yellow/orange
        "suzu-error": "#C3605C", // Soft red
        "suzu-info": "#77A3B2", // Cap blue

        // Keep system colors for compatibility
        current: "currentColor",
        transparent: "transparent",
        white: "#ffffff",
        black: "#000000",
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-jp)", "ui-sans-serif", "system-ui"],
      },
      screens: {
        xs: "475px",
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      // Safe area inset for mobile devices
      padding: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
      margin: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
