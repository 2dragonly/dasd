//@ts-check

/** @param {import("postcss-load-config").Config} config */
function defineConfig(config) {
  return config;
}

export default defineConfig({
  plugins: {
    "tailwindcss/nesting": {},
    tailwindcss: {},
    autoprefixer: {},
  },
});
