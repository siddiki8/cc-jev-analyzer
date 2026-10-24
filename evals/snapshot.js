// Freezes MarketBeat's newest calls to disk so every eval run sees identical inputs.
import { mkdir, writeFile } from "node:fs/promises";
import { extractMarketBeatCalls, extractMarketBeatTranscript } from "../src/marketbeat.js";

const OUT = new URL("./data/transcripts/", import.meta.url);
const MAX_CHARACTERS = 90000;

const directory = await fetch("https://www.marketbeat.com/earnings/transcripts/", { headers: { accept: "text/html" } });
if (!directory.ok) throw new Error(`MarketBeat returned ${directory.status}.`);
const calls = extractMarketBeatCalls(await directory.text());
await mkdir(OUT, { recursive: true });

for (const call of calls) {
  try {
    const page = await fetch(call.source.split("#")[0], { headers: { accept: "text/html" } });
    if (!page.ok) throw new Error(`HTTP ${page.status}`);
    const { text, turns } = extractMarketBeatTranscript(await page.text());
    if (text.length > MAX_CHARACTERS) throw new Error(`${text.length} characters exceeds the app limit`);
    await writeFile(new URL(`${call.id}.json`, OUT), JSON.stringify({ ...call, turns, text, snapshotAt: new Date().toISOString() }, null, 2));
    console.log(`saved ${call.ticker} (${text.length} chars, ${turns} turns)`);
  } catch (error) {
    console.log(`skipped ${call.ticker}: ${error.message}`);
  }
}
