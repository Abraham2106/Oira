import js from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/renderer/**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
      "no-restricted-globals": [
        "error",
        {
          name: "localStorage",
          message: "El renderer no persiste datos clínicos en el navegador.",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "El transcript y la nota se renderizan como texto plano.",
        },
        {
          selector: "CallExpression[callee.name='require']",
          message: "Usa ESM. require está prohibido en el renderer.",
        },
      ],
    },
  },
  {
    files: ["src/main/**/*.ts"],
    rules: {
      "no-console": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
)
