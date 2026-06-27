import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f1115",
        paper: "#f7f5f0",
        clay: "#c4633b",
        clayd: "#a44e2c",
        moss: "#3f5e4e",
        line: "#e3ddd2",
        muted: "#6b6657"
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"]
      }
    }
  },
  plugins: []
};
export default config;
