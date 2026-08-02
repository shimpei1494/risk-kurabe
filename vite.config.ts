import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import reactDoctor from "react-doctor/eslint-plugin";
import { defineConfig, type Plugin } from "vite-plus";

const AI_COMPONENTS_DEV_PATH = "/__dev/ai-components";

function aiComponentsDevPage(): Plugin {
  return {
    name: "risk-kurabe-ai-components-dev-page",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname.replace(
          /\/$/,
          "",
        );
        if (pathname !== AI_COMPONENTS_DEV_PATH) {
          next();
          return;
        }

        const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow" />
    <title>AI UI Lab | TOKYOりすくらべ</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/dev/ai-components/main.tsx"></script>
  </body>
</html>`;
        try {
          const transformed = await server.transformIndexHtml(
            request.url ?? AI_COMPONENTS_DEV_PATH,
            html,
          );
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(transformed);
        } catch (error) {
          next(error as Error);
        }
      });
    },
  };
}

const reactDoctorRules = {
  ...reactDoctor.configs.recommended.rules,
  ...reactDoctor.configs["tanstack-start"].rules,
};

export default defineConfig(({ mode }) => ({
  fmt: {
    ignorePatterns: [".agents/**", "docs/**", "**/routeTree.gen.ts"],
    sortImports: {
      partitionByComment: true,
    },
    sortPackageJson: {
      sortScripts: true,
    },
  },
  lint: {
    categories: {
      correctness: "error",
    },
    env: {
      browser: true,
      node: true,
    },
    ignorePatterns: [".agents/**", "docs/**", "**/routeTree.gen.ts"],
    jsPlugins: [{ name: "react-doctor", specifier: "react-doctor/oxlint-plugin" }],
    options: {
      denyWarnings: true,
      typeAware: true,
      typeCheck: true,
    },
    overrides: [
      {
        files: ["src/router.tsx", "*.config.ts"],
        rules: {
          "no-default-export": "off",
        },
      },
    ],
    plugins: ["react", "react-perf", "import", "jsx-a11y", "promise"],
    rules: {
      ...reactDoctorRules,
      "no-default-export": "error",
    },
  },
  staged: {
    "*.{js,jsx,ts,tsx,json,css}": "vp check --fix",
  },
  plugins: [
    aiComponentsDevPage(),
    mode === "test" ? undefined : cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    // react's vite plugin must come after start's vite plugin
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
}));
