import nextPlugin from "eslint-config-next";

const config = [
  ...nextPlugin,
  {
    ignores: [".next/**", "node_modules/**", "coverage/**"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "import/no-anonymous-default-export": "off"
    }
  }
];

export default config;
