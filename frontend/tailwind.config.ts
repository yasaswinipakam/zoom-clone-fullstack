// Tailwind v4 note: theme tokens are now defined in globals.css via @theme.
// This file is kept only for editor IntelliSense compatibility.
// Content paths are auto-detected by @tailwindcss/postcss in v4.
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
