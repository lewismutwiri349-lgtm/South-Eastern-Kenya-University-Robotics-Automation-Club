import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/**
 * Single flat config for the whole workspace, per
 * docs/12_Coding_Standards.md. One config rather than one per workspace
 * package: the rules that matter (no floating promises, no unused vars, no
 * implicit `any`) are identical in `backend/`, `database/` and `frontend/`,
 * and three drifting copies would be worse than one file with three
 * `files:` blocks.
 *
 * Type-aware linting is deliberately NOT enabled. It requires a
 * `projectService`/`project` pointing at each package's tsconfig and roughly
 * triples lint time, and `tsc --noEmit` — which already runs in every
 * verification pass in this repo — catches the same class of error. If that
 * changes, this is the one place to turn it on.
 *
 * Introduced 2026-09-16. The project had no ESLint config at all before
 * this, despite `frontend/package.json` carrying a `lint` script that would
 * have failed on invocation.
 */
export default tseslint.config(
  {
    // Build output, dependencies and generated migration metadata are never
    // hand-edited, so linting them only produces noise.
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.open-next/**",
      "**/.wrangler/**",
      "database/migrations/**",
      "frontend/next-env.d.ts",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      // Unused args prefixed with `_` are an intentional signal (e.g. an
      // unused `next` in a middleware signature), not an oversight.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // `any` defeats the point of the schema-to-service type flow this
      // codebase is built on. Warn rather than error so it surfaces without
      // blocking, per docs/12_Coding_Standards.md.
      "@typescript-eslint/no-explicit-any": "warn",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // ── Backend + database: Cloudflare Workers runtime ──────────────────────
  {
    files: ["backend/**/*.ts", "database/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.node,
      },
    },
  },

  // Tests legitimately use `console` for diagnostics and are allowed to be
  // less strict than production code.
  {
    files: ["backend/**/*.test.ts", "backend/tests/**/*.ts", "tests/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },

  // ── Frontend: Next.js App Router ────────────────────────────────────────
  {
    files: ["frontend/**/*.{ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooks.configs.recommended.rules,
      // This rule only applies to the Pages Router. The app is App Router
      // only (docs/03_Technical_Architecture.md §2), so leaving it on just
      // emits a "Pages directory cannot be found" warning on every run.
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  // ── Node-context config files ───────────────────────────────────────────
  // CommonJS build configs, not application code — they legitimately use
  // `module`/`require`, which the browser and worker global sets don't
  // include.
  {
    files: ["**/*.config.js", "**/*.config.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
  }
);
