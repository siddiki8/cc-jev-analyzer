import { load } from "cheerio/slim";

const normalize = (value) => value.replace(/\s+/g, " ").trim();

export function extractMarketBeatCalls(html) {
  const $ = load(html);
  const calls = new Map();
  $("tr").each((_, row) => {
    const cells = $(row).children("td");
    const href = cells.find('a[href*="/earnings/reports/"]').first().attr("href");
    if (!href) return;
    const source = new URL(href, "https://www.marketbeat.com");
    const match = source.pathname.match(/^\/earnings\/reports\/([a-z0-9-]+)\/$/);
    if (source.origin !== "https://www.marketbeat.com" || !match) return;
    const ticker = normalize(cells.find(".ticker-area").first().text());
    const name = normalize(cells.find(".title-area").first().text());
    if (!ticker || !name) return;
    if (!calls.has(match[1])) calls.set(match[1], {
      id: match[1], ticker, name, period: normalize(cells.eq(2).text()),
      date: normalize(cells.eq(1).text()), source: `${source.origin}${source.pathname}#transcript`,
    });
  });
  if (!calls.size) throw new Error("No calls found on MarketBeat.");
  return [...calls.values()].slice(0, 10);
}

export function extractMarketBeatTranscript(html) {
  const $ = load(html);
  const lines = [];

  $("#transcriptPresentation > section").each((_, section) => {
    const speakerNode = $(section).find(".transcript-line-speaker .font-weight-bold").first();
    const speaker = normalize(speakerNode.contents().filter((_, node) => node.type === "text").text());
    const timestamp = $(section).find(".transcript-line-speaker time").first().attr("datetime") || "";
    const paragraphs = $(section).find(".transcript-arrow p").map((_, paragraph) => normalize($(paragraph).text())).get().filter(Boolean);
    if (!speaker || paragraphs.length === 0) return;
    lines.push(`${timestamp ? `[${timestamp}] ` : ""}${speaker}\n${paragraphs.join("\n")}`);
  });

  if (lines.length < 5) throw new Error("The full transcript could not be found on MarketBeat.");
  return { text: lines.join("\n\n"), turns: lines.length };
}
