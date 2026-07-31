/** MapLibreの帰属情報を初期表示時だけ折りたたむ。クリックで通常どおり開ける。 */
export function collapseMapAttribution(container: HTMLElement) {
  const attribution = container.querySelector<HTMLElement>(
    "details.maplibregl-ctrl-attrib.maplibregl-compact",
  );
  if (!attribution) return;

  attribution.removeAttribute("open");
  attribution.classList.remove("maplibregl-compact-show");
}
