/// <reference types="vite-plus/client" />
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { theme } from "../theme";

import appCss from "../styles.css?url";
import mantineCss from "@mantine/core/styles.css?url";
import maplibreCss from "maplibre-gl/dist/maplibre-gl.css?url";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: ErrorComponent,
  head: () => ({
    links: [
      { href: mantineCss, rel: "stylesheet" },
      { href: maplibreCss, rel: "stylesheet" },
      { href: appCss, rel: "stylesheet" },
      { href: "https://fonts.googleapis.com", rel: "preconnect" },
      {
        href: "https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Noto+Sans+JP:wght@400;500;700&display=swap",
        rel: "stylesheet",
      },
    ],
    meta: [
      { charSet: "utf8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { title: "リスクくらべ｜災害リスク比較サービス" },
    ],
  }),
  notFoundComponent: NotFoundComponent,
  pendingComponent: PendingComponent,
});

function RootComponent() {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <HeadContent />
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <Outlet />
        </MantineProvider>
        {import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-right" /> : null}
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundComponent() {
  return (
    <div style={{ padding: "1rem" }}>
      <h1>404</h1>
      <p>ページが見つかりませんでした。</p>
    </div>
  );
}

function ErrorComponent() {
  return (
    <main
      style={{
        maxWidth: 560,
        margin: "8vh auto",
        padding: "2rem",
        fontFamily: "'Noto Sans JP', system-ui, sans-serif",
      }}
    >
      <p style={{ color: "#25776f", fontWeight: 700 }}>リスクくらべ</p>
      <h1 style={{ color: "#55524a", fontSize: "1.5rem" }}>画面を表示できませんでした</h1>
      <p style={{ color: "#75726a", lineHeight: 1.8 }}>
        通信状況を確認して再読み込みしてください。入力した住所や地点はサーバーに保存されていません。
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          border: 0,
          borderRadius: 12,
          background: "#2f8f87",
          color: "white",
          padding: "0.75rem 1rem",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        再読み込み
      </button>
    </main>
  );
}

function PendingComponent() {
  return (
    <div style={{ padding: "1rem" }}>
      <p>読み込み中...</p>
    </div>
  );
}
