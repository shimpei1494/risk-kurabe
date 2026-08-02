import type { AssistantFact } from "../../features/assistant/risk-assistant-response";

export interface AssistantPreviewFixture {
  id: string;
  label: string;
  description: string;
  components: readonly string[];
  response: string;
}

export const ASSISTANT_PREVIEW_FIXTURES: readonly AssistantPreviewFixture[] = [
  {
    id: "comparison",
    label: "3地点の比較",
    description: "浸水深と危険度ランクを、境界警告を含む3地点で確認します。",
    components: ["AssistantSummary", "RiskComparison", "AssistantNote", "EvidenceFooter"],
    response: `root = AssistantCard([summary, flood, earthquake, note, evidence])
summary = AssistantSummary("公開データの比較", "地点ごとの違い", "同じ指標ごとに、地点1・地点2・地点3の公表値とデータ状態を比較します。")
flood = RiskComparison("最大浸水深", [{"location":"地点1","value":"0m以上0.5m未満","state":"value","boundaryWarning":true},{"location":"地点2","value":"浸水深表示なし","state":"uncolored","boundaryWarning":false},{"location":"地点3","value":"0.5m以上3.0m未満","state":"value","boundaryWarning":true}])
earthquake = RiskComparison("東京都・地震時の総合危険度", [{"location":"地点1","value":"ランク3／5","state":"value","boundaryWarning":true},{"location":"地点2","value":"ランク3／5","state":"value","boundaryWarning":false},{"location":"地点3","value":"ランク4／5","state":"value","boundaryWarning":false}])
note = AssistantNote("boundary", "ピン付近に判定境界があります。")
evidence = EvidenceFooter("根拠は、現在表示中の3地点の公開データです。各指標の公表値と境界警告を確認してください。")`,
  },
  {
    id: "hazard-map-links",
    label: "公式ハザードマップ導線",
    description: "地点ごとの外部リンクと、地震データとは異なる情報であることを確認します。",
    components: ["AssistantSummary", "AssistantNote", "HazardMapLinks", "EvidenceFooter"],
    response: `root = AssistantCard([summary, note, links, evidence])
summary = AssistantSummary("公式情報の確認", "浸水などを地図で詳しく確認", "表示中の地点を、国土地理院の重ねるハザードマップで開けます。")
note = AssistantNote("information", "重ねるハザードマップは浸水・内水・土砂災害・高潮・津波などの確認用です。東京都の地震地域危険度とは別のデータです。")
links = HazardMapLinks([1,2,3])
evidence = EvidenceFooter("外部サイトでは、表示内容と凡例をあわせて確認してください。")`,
  },
  {
    id: "states",
    label: "データ状態一覧",
    description: "値あり、着色なし、区域外、未公開、対象外、判定不能の表示を確認します。",
    components: ["AssistantSummary", "RiskFact", "AssistantNote"],
    response: `root = AssistantCard([summary, valueFact, uncoloredFact, outsideFact, unpublishedFact, notApplicableFact, undeterminedFact, note])
summary = AssistantSummary("状態表示", "値がない理由を分けて表示", "似て見える状態でも意味が異なるため、文言とバッジを並べて確認します。")
valueFact = RiskFact("地点1", "最大浸水深", "3.0m以上5.0m未満", "value")
uncoloredFact = RiskFact("地点2", "最大浸水深", "浸水深表示なし", "uncolored")
outsideFact = RiskFact("地点3", "最大浸水深", "区域外", "outOfArea")
unpublishedFact = RiskFact("地点1", "公開状況", "未公開", "unpublished")
notApplicableFact = RiskFact("地点2", "東京都・地震時の総合危険度", "対象外", "notApplicable")
undeterminedFact = RiskFact("地点3", "最大浸水深", "判定データなし", "undetermined")
note = AssistantNote("warning", "値が表示されない理由は状態ごとに異なります。低リスクや安全を意味する表示ではありません。")`,
  },
  {
    id: "text",
    label: "通常テキスト",
    description: "挨拶や機能範囲など、データUIが不要な応答を確認します。",
    components: ["AssistantText"],
    response: `root = AssistantCard([message])
message = AssistantText("こんにちは。表示中の公開データについて、用語の意味や地点ごとの違いを説明できます。気になる指標を教えてください。")`,
  },
  {
    id: "long-copy",
    label: "長文・狭幅確認",
    description: "長い地点名と説明文を使い、折り返しや高さを確認します。",
    components: ["AssistantSummary", "RiskFact", "AssistantNote", "EvidenceFooter"],
    response: `root = AssistantCard([summary, fact, note, evidence])
summary = AssistantSummary("公開データの読み方", "長い見出しが複数行になった場合の表示を確認します", "この文章は、サイドバーの幅が狭い場合や利用者への説明が長くなった場合に、文字の折り返し、余白、カード全体の読みやすさを確認するためのサンプルです。")
fact = RiskFact("地点名が非常に長い場合の表示確認用地点", "東京都・地震時の総合危険度", "ランク4／5", "value")
note = AssistantNote("information", "公表ランクは東京都内の町丁目間の相対評価です。異なる災害指標と足し合わせたり、居住先の推奨順位として使用したりするものではありません。")
evidence = EvidenceFooter("根拠は現在表示している公開データに限られます。詳細は各データ提供元の定義と自治体のハザードマップを確認してください。")`,
  },
];

export const ASSISTANT_FACT_SETS: ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  facts: readonly AssistantFact[];
}> = [
  {
    id: "comparison",
    label: "3地点の比較データ",
    description: "浸水深と東京都の地震危険度を含みます。",
    facts: [
      {
        location: "地点1",
        indicator: "最大浸水深",
        value: "0m以上0.5m未満",
        state: "value",
        boundaryWarning: true,
      },
      {
        location: "地点2",
        indicator: "最大浸水深",
        value: "浸水深表示なし",
        state: "uncolored",
        boundaryWarning: false,
      },
      {
        location: "地点3",
        indicator: "最大浸水深",
        value: "0.5m以上3.0m未満",
        state: "value",
        boundaryWarning: true,
      },
      {
        location: "地点1",
        indicator: "東京都・地震時の総合危険度",
        value: "ランク3／5",
        state: "value",
        boundaryWarning: true,
      },
      {
        location: "地点2",
        indicator: "東京都・地震時の総合危険度",
        value: "ランク3／5",
        state: "value",
        boundaryWarning: false,
      },
      {
        location: "地点3",
        indicator: "東京都・地震時の総合危険度",
        value: "ランク4／5",
        state: "value",
        boundaryWarning: false,
      },
    ],
  },
  {
    id: "states",
    label: "値がない状態",
    description: "着色なし、区域外、対象外、判定不能を含みます。",
    facts: [
      {
        location: "地点1",
        indicator: "最大浸水深",
        value: "浸水深表示なし",
        state: "uncolored",
        boundaryWarning: false,
      },
      {
        location: "地点2",
        indicator: "最大浸水深",
        value: "判定データなし",
        state: "undetermined",
        boundaryWarning: false,
      },
      {
        location: "地点3",
        indicator: "東京都・地震時の総合危険度",
        value: "対象外",
        state: "notApplicable",
        boundaryWarning: false,
      },
    ],
  },
  {
    id: "single",
    label: "1地点の公開値",
    description: "単一地点への質問を確認します。",
    facts: [
      {
        location: "地点1",
        indicator: "最大浸水深",
        value: "3.0m以上5.0m未満",
        state: "value",
        boundaryWarning: true,
      },
      {
        location: "地点1",
        indicator: "東京都・地震時の総合危険度",
        value: "ランク2／5",
        state: "value",
        boundaryWarning: false,
      },
    ],
  },
];
