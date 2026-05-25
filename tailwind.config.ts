import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#ffffff",
        muted: "#9ca3af",
        field: "#111111",
        line: "#1a1a1a",
        arc: "#3B82F6",
        signal: "#ef4444",
        void: "#0a0a0a"
      }
    }
  },
  plugins: []
};

export default config;
