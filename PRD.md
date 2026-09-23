# Earnings Call Signals — demo scope

Build a small, TypeSafe Typewriter-style demo for earnings-call analysis.

## Experience

- Show the ten newest unique, source-linked calls from MarketBeat's transcript directory. Selecting one fetches the full transcript, fills the editor, and immediately asks Jev for analysis.
- Let a visitor paste or edit an earnings-call transcript in the same editor and press **Analyze call**.
- Show sixteen bounded judgments in four groups: business momentum, earnings and cash quality, outlook and resilience, and capital and accountability. Each shows Jev's selected category, its probability and an always-visible, color-coded distribution bar. Expand to see every option and its probability.
- Clear a previous result when a new call is selected or the text changes, so an old company's judgment is never shown under a new name. Never fabricate a result when the API key is missing or the call fails.
- Show the MarketBeat source link and the full retrieved text for each selected call.

## Implementation

- One Cloudflare Worker serves the static UI, refreshes and validates MarketBeat's latest ten listings, fetches their full transcripts, and handles `POST /api/analyze`.
- The Worker calls OpenRouter's Jev Decisions API with one state and sixteen independent Choice questions.
- `OPENROUTER_API_KEY` stays in a Worker secret. The browser never receives it.
- A small request limit and input-size limit protect the public demo. The OpenRouter key should also have a spend cap.
- This is a qualitative signal panel. It does not calculate earnings surprises, produce a price target, or issue a trade recommendation.
- Default presentation is white with near-black text. Green marks favorable classifications, red marks pressure, amber marks mixed or cautionary classifications, blue marks balanced classifications, and gray marks insufficient evidence. The colors describe business signals, not expected stock returns.

## Sources

- [TypeSafe Typewriter](https://www.val.town/x/stevekrouse/typesafe-typewriter)
- [OpenRouter Jev Decisions API](https://openrouter.ai/blog/tutorials/jev-vs-llm-when-to-use-each/)
- [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [MarketBeat earnings call transcripts](https://www.marketbeat.com/earnings/transcripts/)
