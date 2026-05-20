import baseConfig from "../../../../../eslint.config.js";

export default baseConfig.append({
  files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  rules: {
    "unicorn/filename-case": "off",
  },
});
