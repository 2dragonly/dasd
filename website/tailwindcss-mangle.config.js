import { defineConfig } from "tailwindcss-patch";

export default defineConfig({
  mangle: {
    classGenerator: {
      classPrefix: "‎",
    },
  },
});
