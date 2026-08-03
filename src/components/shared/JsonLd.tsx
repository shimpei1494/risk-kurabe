export function JsonLd({ data }: { data: unknown }) {
  const serialized = JSON.stringify(data).replaceAll("<", "\\u003c");

  return <script type="application/ld+json">{serialized}</script>;
}
