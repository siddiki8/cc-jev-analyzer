# Earnings Call Signals

A small earnings-call demo inspired by [TypeSafe Typewriter](https://www.val.town/x/stevekrouse/typesafe-typewriter). Select any of the ten newest calls on MarketBeat or paste your own. A Cloudflare Worker asks OpenRouter Jev sixteen bounded questions and shows a color-coded probability distribution for each answer.

## Run locally

```sh
npm install
```

Create `.dev.local` with `OPENROUTER_API_KEY=...`, then run:

```sh
npm run dev
```

Open <http://localhost:8787>. Without the key, the interface still loads and explains that analysis is unavailable.

## Eval

[`evals/`](evals/README.md) scores Jev's sixteen answers on frozen MarketBeat calls. Claude Opus 5.5 provides gold labels, Claude Sonnet 5.5 acts as a validated LLM judge, and perturbation tests probe Q&A removal, prompt injection, optimistic fluff and truncation. See [`evals/results/report.md`](evals/results/report.md).

## Deploy

```sh
npm run deploy
npx wrangler secret put OPENROUTER_API_KEY
```

The Worker name is `earnings-call-signals`. Set a spend cap on the OpenRouter key before sharing the public URL. The key is never sent to the browser. The public demo enforces a 90,000-character input cap and a best-effort per-IP limit of 12 analyses per minute per Worker isolate.

Cloudflare also supports `npx wrangler deploy --temporary` for an unauthenticated preview. A temporary deployment must be claimed within the period shown by Wrangler; add the secret to the claimed Worker afterward.

## Data and scope

The Worker reads the [MarketBeat transcripts directory](https://www.marketbeat.com/earnings/transcripts/) and offers its ten newest unique listings, refreshing the directory every five minutes per Worker isolate. It fetches a selected page live and extracts every speaker turn, including Q&A, before analysis. The browser shows the retrieved text and its source link. If MarketBeat changes its page markup or blocks server requests, loading a call fails with an explicit error. Visitors may also paste their own transcript. Jev evaluates qualitative statements; this demo does not calculate consensus surprises or generate a trade signal.

The sixteen criteria cover demand, organic growth, realized pricing, competitive position, margin durability, earnings adjustments, cash conversion, working capital, guidance revision, outlook visibility, funding, execution, capital allocation, dilution, disclosure quality and Q&A accountability. Guidance revision requires an explicitly stated prior baseline in the call. Bars show Jev's classification probabilities; their green, red, amber, blue and gray colors convey favorable, pressured, mixed, balanced and unclear readings respectively.

Each completed run shows OpenRouter's reported USD cost and input token count. The browser measures the Jev request round trip; for MarketBeat calls it also shows transcript load time and total click-to-result time. These are observed run times, not model-only inference times. OpenRouter documents `usage.cost` for the [Decisions API](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request).

The Worker calls OpenRouter's [Decisions API](https://openrouter.ai/blog/tutorials/jev-vs-llm-when-to-use-each/) at `/api/alpha/decisions` using `typesafe/jev-1.13`.
