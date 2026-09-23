import { decisionQuestions, publicQuestions, QUESTION_GROUPS, QUESTIONS } from "./questions.js";
import { extractMarketBeatCalls, extractMarketBeatTranscript } from "./marketbeat.js";

const MAX_CHARACTERS = 90000;
const MIN_CHARACTERS = 80;
const REQUESTS_PER_MINUTE = 12;
const DEFAULT_MODEL = "typesafe/jev-1.13";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

function cleanAnswers(raw) {
  const answers = {};
  for (const [id, question] of Object.entries(QUESTIONS)) {
    const answer = raw?.[id];
    if (answer?.type !== "choice" || !Object.hasOwn(question.criteria, answer.choice)) {
      answers[id] = null;
      continue;
    }
    const probabilities = {};
    for (const option of Object.keys(question.criteria)) {
      const value = Number(answer.probabilities?.[option]);
      probabilities[option] = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    }
    answers[id] = { choice: answer.choice, probabilities };
  }
  return answers;
}

export function createWorker(fetchUpstream = fetch) {
  const recentRequests = new Map();
  let catalog;
  let catalogRequest;
  async function getCalls() {
    if (catalog && Date.now() - catalog.timestamp < 300000) return catalog;
    if (catalogRequest) return catalogRequest;
    catalogRequest = (async () => {
      const response = await fetchUpstream("https://www.marketbeat.com/earnings/transcripts/", {
        headers: { accept: "text/html" }, signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`MarketBeat returned ${response.status}.`);
      const html = await response.text();
      if (html.length > 2_000_000) throw new Error("MarketBeat page is too large.");
      catalog = { calls: extractMarketBeatCalls(html), timestamp: Date.now() };
      return catalog;
    })();
    try { return await catalogRequest; } finally { catalogRequest = null; }
  }

  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname === "/api/config" && request.method === "GET") {
        return json({
          ready: Boolean(env.OPENROUTER_API_KEY),
          model: env.OPENROUTER_MODEL || DEFAULT_MODEL,
          maxCharacters: MAX_CHARACTERS,
          groups: QUESTION_GROUPS,
          questions: publicQuestions(),
        });
      }

      if (url.pathname === "/api/calls" && request.method === "GET") {
        try {
          const { calls, timestamp } = await getCalls();
          return json({ calls, fetchedAt: new Date(timestamp).toISOString() });
        } catch {
          return json({ error: "Could not load the latest calls from MarketBeat. Retry or paste a transcript." }, 502);
        }
      }

      const transcriptMatch = url.pathname.match(/^\/api\/transcripts\/([a-z0-9-]+)$/);
      if (transcriptMatch) {
        if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { allow: "GET" });
        let sample;
        try { sample = (await getCalls()).calls.find((item) => item.id === transcriptMatch[1]); }
        catch { return json({ error: "Could not load the MarketBeat call directory. Try again." }, 502); }
        if (!sample) return json({ error: "Unknown call." }, 404);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        let sourceResponse;
        try {
          sourceResponse = await fetchUpstream(sample.source.split("#")[0], {
            headers: { accept: "text/html" },
            signal: controller.signal,
          });
          if (!sourceResponse.ok) return json({ error: `MarketBeat returned ${sourceResponse.status}. Try again later.` }, 502);
          const declaredLength = Number(sourceResponse.headers.get("content-length"));
          if (Number.isFinite(declaredLength) && declaredLength > 2_000_000) {
            return json({ error: "The source page is too large to read." }, 502);
          }
          const html = await sourceResponse.text();
          if (html.length > 2_000_000) return json({ error: "The source page is too large to read." }, 502);
          const transcript = extractMarketBeatTranscript(html);
          if (transcript.text.length > MAX_CHARACTERS) {
            return json({ error: "This full call exceeds the demo's 90,000-character limit." }, 413);
          }
          return json({ ...transcript, id: sample.id, source: sample.source });
        } catch (error) {
          return json({ error: error?.name === "AbortError" ? "MarketBeat timed out. Try again." : "Could not read the full MarketBeat transcript." }, 502);
        } finally {
          clearTimeout(timeout);
        }
      }

      if (url.pathname === "/api/analyze") {
        if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { allow: "POST" });
        if (!env.OPENROUTER_API_KEY) return json({ error: "OpenRouter key is not configured on this Worker yet." }, 503);
        if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
          return json({ error: "Send JSON with a text field." }, 415);
        }
        const declaredLength = Number(request.headers.get("content-length"));
        if (Number.isFinite(declaredLength) && declaredLength > MAX_CHARACTERS * 4) {
          return json({ error: "Call is too long for this demo." }, 413);
        }
        let payload;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON." }, 400);
        }
        const callText = typeof payload?.text === "string" ? payload.text.trim() : "";
        if (callText.length < MIN_CHARACTERS) return json({ error: "Paste at least 80 characters from a call." }, 400);
        if (callText.length > MAX_CHARACTERS) return json({ error: `Limit this demo to ${MAX_CHARACTERS.toLocaleString()} characters.` }, 413);

        const ip = request.headers.get("CF-Connecting-IP") || "local";
        const now = Date.now();
        const timestamps = (recentRequests.get(ip) || []).filter((time) => now - time < 60000);
        if (timestamps.length >= REQUESTS_PER_MINUTE) {
          return json({ error: "Too many analyses. Try again in a minute." }, 429, { "retry-after": "60" });
        }
        timestamps.push(now);
        recentRequests.set(ip, timestamps);
        if (recentRequests.size > 5000) {
          for (const [key, values] of recentRequests) {
            if (values.every((time) => now - time >= 60000)) recentRequests.delete(key);
          }
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        let upstream;
        try {
          upstream = await fetchUpstream("https://openrouter.ai/api/alpha/decisions", {
            method: "POST",
            headers: {
              authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
              "content-type": "application/json",
              "HTTP-Referer": url.origin,
              "X-Title": "Earnings Call Signals",
            },
            body: JSON.stringify({
              model: env.OPENROUTER_MODEL || DEFAULT_MODEL,
              state: { call: callText },
              questions: decisionQuestions(),
            }),
            signal: controller.signal,
          });
        } catch (error) {
          return json({ error: error?.name === "AbortError" ? "OpenRouter timed out. Try again." : "Could not reach OpenRouter." }, 502);
        } finally {
          clearTimeout(timeout);
        }

        if (!upstream.ok) {
          return json({ error: `OpenRouter returned ${upstream.status}. Check the model and key, then retry.` }, 502);
        }
        let result;
        try {
          result = await upstream.json();
        } catch {
          return json({ error: "OpenRouter returned an unreadable response." }, 502);
        }
        if (!result || typeof result.answers !== "object" || result.answers === null) {
          return json({ error: "OpenRouter returned no decisions." }, 502);
        }
        return json({
          answers: cleanAnswers(result.answers),
          model: result.model || env.OPENROUTER_MODEL || DEFAULT_MODEL,
          usage: result.usage ? { inputTokens: result.usage.input_tokens ?? null, cost: result.usage.cost ?? null } : null,
          analyzedAt: new Date().toISOString(),
        });
      }

      if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
      if (!env.ASSETS) return new Response("Static assets binding is missing.", { status: 500 });
      return env.ASSETS.fetch(request);
    },
  };
}

export default createWorker();
