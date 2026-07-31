import { Accordion } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "../components/shared/InfoPage";

export const Route = createFileRoute("/faq")({ component: FaqPage });

function FaqPage() {
  return (
    <InfoPage title="よくある質問" lead="表示される値の読み方と、確認時の注意点をまとめています。">
      <Accordion variant="separated" radius="md">
        <Accordion.Item value="safe">
          <Accordion.Control>区域外なら安全ですか？</Accordion.Control>
          <Accordion.Panel>
            区域外は、このデータで指定された区域の外という意味で、安全を示しません。
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="precision">
          <Accordion.Control>浸水深は実測値ですか？</Accordion.Control>
          <Accordion.Panel>
            公表された想定浸水深の階級です。個別の建物や敷地の高さを示すものではありません。
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="official">
          <Accordion.Control>どこで最終確認すればよいですか？</Accordion.Control>
          <Accordion.Panel>
            自治体の最新ハザードマップと、国のハザードマップポータルを確認してください。
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </InfoPage>
  );
}
