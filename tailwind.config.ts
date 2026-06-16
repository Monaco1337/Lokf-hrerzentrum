import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#0f1f4d",
        },
        navy: {
          50: "#f5f7fb",
          100: "#e7ecf3",
          200: "#cfd8e6",
          300: "#9faec9",
          400: "#6c80a4",
          500: "#445a82",
          600: "#2b3f63",
          700: "#1d2d4b",
          800: "#131e36",
          900: "#0b1530",
          950: "#070d20",
        },
        accent: {
          50: "#f1f7f2",
          100: "#dfeae2",
          200: "#bcd2c1",
          400: "#6ba376",
          500: "#4A8F57",
          600: "#3F7248",
          700: "#35613D",
          800: "#2b4f32",
          900: "#213c27",
        },
        ink: {
          DEFAULT: "#0f172a",
          soft: "#334155",
          muted: "#64748b",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f8fafc",
          muted: "#f1f5f9",
        },
        // -----------------------------------------------------------------
        // Operations Center palette — Dark Executive surface used in /crm.
        // Mirrors the Born-to-Run reference: deep black canvas, layered
        // cards, hairline borders, semantic status hues.
        // -----------------------------------------------------------------
        ops: {
          // Canvas + layers
          bg: "#050505",
          card: "#0D0D0F",
          elevated: "#161618",
          raised: "#1C1C20",
          hover: "#212126",
          // Hairlines
          border: "rgba(255,255,255,0.08)",
          "border-strong": "rgba(255,255,255,0.14)",
          // Text
          text: "#F5F5F5",
          muted: "#A1A1AA",
          dim: "#71717A",
          // Status accents — vivid, semantic, never decorative
          orange: "#F97316",
          "orange-soft": "rgba(249,115,22,0.12)",
          "orange-edge": "rgba(249,115,22,0.30)",
          amber: "#F59E0B",
          "amber-soft": "rgba(245,158,11,0.12)",
          red: "#EF4444",
          "red-soft": "rgba(239,68,68,0.12)",
          "red-edge": "rgba(239,68,68,0.30)",
          green: "#22C55E",
          "green-soft": "rgba(34,197,94,0.12)",
          "green-edge": "rgba(34,197,94,0.30)",
          blue: "#3B82F6",
          "blue-soft": "rgba(59,130,246,0.12)",
          violet: "#A78BFA",
          "violet-soft": "rgba(167,139,250,0.12)",
          cyan: "#22D3EE",
          "cyan-soft": "rgba(34,211,238,0.12)",
        },
        success: "#15803d",
        warning: "#b45309",
        danger: "#b91c1c",
      },
      fontFamily: {
        sans: [
          "var(--font-montserrat)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "var(--font-montserrat)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)",
        elevated: "0 10px 25px -10px rgb(15 23 42 / 0.15)",
        premium:
          "0 24px 50px -28px rgb(11 21 48 / 0.32), 0 8px 20px -12px rgb(11 21 48 / 0.12)",
        cta:
          "0 16px 34px -14px rgb(63 114 72 / 0.45), 0 6px 14px -6px rgb(63 114 72 / 0.22)",
        "cta-hover":
          "0 22px 44px -14px rgb(63 114 72 / 0.55), 0 8px 18px -6px rgb(63 114 72 / 0.28)",
        ring: "0 0 0 1px rgb(15 23 42 / 0.05)",
      },
      borderRadius: {
        card: "0.75rem",
        xl2: "1.25rem",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(60% 60% at 15% 0%, rgba(29, 78, 216, 0.10) 0%, rgba(29, 78, 216, 0) 70%), radial-gradient(45% 50% at 95% 10%, rgba(63, 114, 72, 0.08) 0%, rgba(63, 114, 72, 0) 70%)",
        "navy-soft":
          "linear-gradient(180deg, #ffffff 0%, #f7f9fc 60%, #eef2f8 100%)",
        "grid-faint":
          "linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-32": "32px 32px",
      },
    },
  },
  plugins: [],
};

export default config;
