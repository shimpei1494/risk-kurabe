export const APP_NAME = "TOKYOりすくらべ";
export const APP_DESCRIPTION = "関東の災害リスク比較サービス";
export const APP_TITLE = `${APP_NAME}｜${APP_DESCRIPTION}`;
export const APP_OG_DESCRIPTION =
  "公開データをもとに、関東の災害リスクを1〜3地点で確認・比較できます。";
export const APP_ORIGIN = "https://risk-kurabe.tokyo-odh-044.workers.dev";
export const APP_OG_IMAGE_URL = `${APP_ORIGIN}/brand/ogp.jpg`;

export function createSeoHead({
  path,
  title,
  description,
  noIndex = false,
}: {
  path: string;
  title: string;
  description: string;
  noIndex?: boolean;
}) {
  const url = `${APP_ORIGIN}${path}`;

  return {
    links: [{ rel: "canonical", href: url }],
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(noIndex ? [{ name: "robots", content: "noindex,follow" }] : []),
    ],
  };
}

/** ヘッダー・フッターのブランドマークに使うアプリアイコン（地図をのぞくリス） */
export const BRAND_MARK_URL = "/brand/app-icon-512.png";
/** 小さな表示でもリスの顔が見えやすい、ヘッダー・フッター用の簡略マーク */
export const BRAND_COMPACT_MARK_URL = "/brand/icon-192.png";
/** トップのヒーローイラスト。左半分が余白の構図なので、広い画面ではコピーを左に並べる */
export const BRAND_HERO_URL = "/brand/hero-map-scout.jpg";
export const BRAND_HERO_ALT =
  "地図の上に2つのどんぐりを置き、虫めがねで見くらべているリスのイラスト";
