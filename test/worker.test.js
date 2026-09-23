import assert from "node:assert/strict";
import { test } from "node:test";
import { createWorker } from "../src/worker.js";
import { QUESTIONS } from "../src/questions.js";
import { extractMarketBeatCalls, extractMarketBeatTranscript } from "../src/marketbeat.js";

const request = (path, init) => new Request(`https://demo.example${path}`, init);

const directoryRow = (index, origin = "") => `<tr><td><div class="ticker-area">TEST${index}</div><div class="title-area">Company ${index}</div></td><td>09/22/26 5:00 PM ET</td><td>Q3 2026</td><td><a href="${origin}/earnings/reports/2026-9-22-company-${index}/#transcript">Read</a></td></tr>`;
test("directory preserves source order, deduplicates, rejects other hosts and takes latest ten", () => {
  const rows = Array.from({ length: 12 }, (_, i) => directoryRow(i)).join("");
  const calls = extractMarketBeatCalls(`<table>${directoryRow(99, "https://evil.example")}${rows}${rows}</table>`);
  assert.equal(calls.length, 10);
  assert.deepEqual(calls.map(c => c.ticker), Array.from({ length: 10 }, (_, i) => `TEST${i}`));
  assert.equal(calls[0].period, "Q3 2026");
  assert.equal(calls[0].source, "https://www.marketbeat.com/earnings/reports/2026-9-22-company-0/#transcript");
  assert.throws(() => extractMarketBeatCalls("<html>No transcripts</html>"));
});

test("directory is cached and transcript fetching is restricted to listed calls", async () => {
  const urls = [];
  const worker = createWorker(async (url) => { urls.push(url); return new Response(`<table>${directoryRow(0)}</table>`); });
  assert.equal((await worker.fetch(request("/api/calls"), {})).status, 200);
  assert.equal((await worker.fetch(request("/api/calls"), {})).status, 200);
  assert.equal((await worker.fetch(request("/api/transcripts/not-listed"), {})).status, 404);
  assert.deepEqual(urls, ["https://www.marketbeat.com/earnings/transcripts/"]);
});

test("directory failure is explicit and never returns static sample calls", async () => {
  const worker = createWorker(async () => new Response("Unavailable", { status: 503 }));
  const response = await worker.fetch(request("/api/calls"), {});
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /paste a transcript/);
});

test("configuration exposes criteria and reports missing key", async () => {
  const worker = createWorker();
  const response = await worker.fetch(request("/api/config"), {});
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ready, false);
  assert.equal(Object.keys(body.questions).length, 16);
  assert.equal(body.groups.length, 4);
  assert.ok(body.questions.guidance.description.includes("prior guidance"));
  assert.equal(JSON.stringify(body).includes("OPENROUTER_API_KEY"), false);
});

test("analysis uses OpenRouter Decisions API and returns bounded answers", async () => {
  let upstreamCall;
  const mockFetch = async (url, init) => {
    upstreamCall = { url, init, body: JSON.parse(init.body) };
    const answers = Object.fromEntries(Object.entries(QUESTIONS).map(([id, question]) => {
      const choice = Object.keys(question.criteria)[0];
      return [id, { type: "choice", choice, probabilities: { [choice]: 0.82 } }];
    }));
    return new Response(JSON.stringify({ answers, model: "typesafe/jev-1.13", usage: { input_tokens: 123, cost: 0.00001 } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const worker = createWorker(mockFetch);
  const response = await worker.fetch(request("/api/analyze", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "Management expects demand to grow next quarter, but higher capital spending may reduce free cash flow this year." }),
  }), { OPENROUTER_API_KEY: "test-key" });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(upstreamCall.url, "https://openrouter.ai/api/alpha/decisions");
  assert.equal(upstreamCall.init.headers.authorization, "Bearer test-key");
  assert.equal(upstreamCall.body.model, "typesafe/jev-1.13");
  assert.equal(Object.keys(upstreamCall.body.questions).length, 16);
  assert.equal(upstreamCall.body.questions.demand.type, "choice");
  assert.equal(body.answers.demand.choice, "strengthening");
  assert.equal(body.answers.demand.probabilities.strengthening, 0.82);
  assert.equal(body.usage.cost, 0.00001);
  assert.equal(body.usage.inputTokens, 123);
});

test("MarketBeat extraction keeps the complete sequence through Q&A", () => {
  const turns = [
    ["Operator", "Welcome to the call."],
    ["CEO", "Demand improved in the quarter."],
    ["CFO", "Margins remained stable."],
    ["Analyst", "What changed in customer orders?"],
    ["CEO", "Orders increased across several regions."],
    ["Operator", "This concludes the call."],
  ];
  const markup = `<div id="transcriptPresentation">${turns.map(([speaker, speech], index) => `
    <section class="transcript-line-left"><div class="transcript-arrow">
      <div class="transcript-line-speaker"><div class="font-weight-bold">${speaker}<div class="secondary-title">Role</div></div><time datetime="00:00:0${index}"></time></div>
      <p>${speech}</p>
    </div></section>`).join("")}</div>`;
  const transcript = extractMarketBeatTranscript(markup);
  assert.equal(transcript.turns, turns.length);
  assert.match(transcript.text, /\[00:00:03\] Analyst\nWhat changed in customer orders\?/);
  assert.match(transcript.text, /This concludes the call\.$/);
  assert.equal(transcript.text.includes("Role"), false);
});

test("analysis rejects missing key, short input, and invalid upstream choices", async () => {
  const noKeyWorker = createWorker();
  const input = "This is a sufficiently long earnings call excerpt about revenue, margins, and demand during the period.";
  const init = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: input }) };
  assert.equal((await noKeyWorker.fetch(request("/api/analyze", init), {})).status, 503);

  const worker = createWorker(async () => new Response(JSON.stringify({ answers: { demand: { type: "choice", choice: "buy_stock", probabilities: {} } } }), { status: 200 }));
  assert.equal((await worker.fetch(request("/api/analyze", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "Short" }),
  }), { OPENROUTER_API_KEY: "test" })).status, 400);
  const response = await worker.fetch(request("/api/analyze", init), { OPENROUTER_API_KEY: "test" });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.answers.demand, null);
});
