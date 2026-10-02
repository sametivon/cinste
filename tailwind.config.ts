import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: { extend: { colors: { ink: "#17211f", cream: "#fffdf7", coral: "#ff715b", mint: "#caefd7", forest: "#176b4d" } } }, plugins: [] } satisfies Config;
