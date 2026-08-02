/// <reference types="vite-plus/client" />
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { OpenUIDevtools } from "@openuidev/devtools";
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_OG_DESCRIPTION,
  APP_OG_IMAGE_URL,
  APP_TITLE,
  BRAND_MARK_URL,
} from "../brand";
import { ComparisonSessionProvider } from "../features/comparison/comparison-session";
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
      { href: "/brand/favicon-32.png", rel: "icon", sizes: "32x32", type: "image/png" },
      { href: "/brand/favicon-16.png", rel: "icon", sizes: "16x16", type: "image/png" },
      { href: "/brand/apple-touch-icon.png", rel: "apple-touch-icon", sizes: "180x180" },
      { href: "/site.webmanifest", rel: "manifest" },
      { href: "https://fonts.googleapis.com", rel: "preconnect" },
      {
        href: "https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Noto+Sans+JP:wght@400;500;700&display=swap",
        rel: "stylesheet",
      },
    ],
    meta: [
      { charSet: "utf8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { content: "#2F8F87", name: "theme-color" },
      { content: APP_OG_DESCRIPTION, name: "description" },
      { content: APP_TITLE, property: "og:title" },
      { content: APP_OG_DESCRIPTION, property: "og:description" },
      { content: "website", property: "og:type" },
      { content: "ja_JP", property: "og:locale" },
      { content: APP_OG_IMAGE_URL, property: "og:image" },
      { content: "1200", property: "og:image:width" },
      { content: "630", property: "og:image:height" },
      {
        content: `${APP_NAME} — ${APP_DESCRIPTION}`,
        property: "og:image:alt",
      },
      { content: "summary_large_image", name: "twitter:card" },
      { content: APP_TITLE, name: "twitter:title" },
      { content: APP_OG_DESCRIPTION, name: "twitter:description" },
      { content: APP_OG_IMAGE_URL, name: "twitter:image" },
      { title: APP_TITLE },
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
          <ComparisonSessionProvider>
            <Outlet />
          </ComparisonSessionProvider>
        </MantineProvider>
        {import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-right" /> : null}
        {import.meta.env.DEV ? <OpenUIDevtools position="bottom-left" /> : null}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * 404・読み込み中はテーマの読み込みに失敗しても崩れないよう、
 * ErrorComponentと同じくMantineに依存しないインラインスタイルで組む。
 */
const statusPageStyle = {
  maxWidth: 520,
  margin: "12vh auto",
  padding: "0 1.5rem",
  fontFamily: "'Noto Sans JP', system-ui, sans-serif",
  textAlign: "center",
} as const;

const statusMarkStyle = {
  width: 88,
  height: 88,
  borderRadius: 20,
  border: "1px solid #dcd9d2",
  background: "#f2f0eb",
} as const;

const statusHeadingStyle = {
  margin: "0.25rem 0 0",
  color: "#44423c",
  fontFamily: "'Zen Maru Gothic', 'Noto Sans JP', sans-serif",
  fontSize: "1.4rem",
} as const;

const statusBodyStyle = {
  margin: "0.75rem 0 0",
  color: "#75726a",
  fontSize: 13.5,
  lineHeight: 1.9,
} as const;

const statusLinkStyle = {
  display: "inline-block",
  marginTop: "1.5rem",
  padding: "0.7rem 1.4rem",
  borderRadius: 999,
  background: "#2f8f87",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  textDecoration: "none",
} as const;

function NotFoundComponent() {
  return (
    <main style={statusPageStyle}>
      <img src={BRAND_MARK_URL} alt="" style={statusMarkStyle} decoding="async" />
      <p style={{ margin: "1.25rem 0 0", color: "#25776f", fontSize: 13, fontWeight: 700 }}>404</p>
      <h1 style={statusHeadingStyle}>ページが見つかりませんでした</h1>
      <p style={statusBodyStyle}>
        URLが変わったか、削除された可能性があります。
        <br />
        トップから地点を調べ直してください。
      </p>
      <Link to="/" style={statusLinkStyle}>
        トップへ戻る
      </Link>
    </main>
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
      <p style={{ color: "#25776f", fontWeight: 700 }}>{APP_NAME}</p>
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
    <main style={statusPageStyle}>
      <img src={BRAND_MARK_URL} alt="" style={statusMarkStyle} decoding="async" />
      <p style={{ margin: "1.25rem 0 0", color: "#75726a", fontSize: 13.5 }}>読み込んでいます…</p>
    </main>
  );
}
