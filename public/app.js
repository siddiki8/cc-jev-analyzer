const $ = (id) => document.getElementById(id);
const state = { config: null, calls: [], selected: null, result: null, pending: null, loading: null };
const readable = (value) => value.replaceAll("_", " ");
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function error(message = "") { $("error").textContent = message; $("error").hidden = !message; }
function status(message, kind = "") { $("results-state").textContent = message; $("results-state").className = `status ${kind}`; }
function updateEditor() {
  $("character-count").textContent = `${$("call-text").value.length.toLocaleString()} characters`;
  $("analyze").disabled = !state.config || $("call-text").value.trim().length < 80 || Boolean(state.pending || state.loading);
  $("analyze").textContent = state.pending ? "Analyzing…" : state.result ? "Analyze again" : "Analyze call";
  document.querySelector(".analysis").setAttribute("aria-busy", String(Boolean(state.pending || state.loading)));
}
function cancel() {
  state.pending?.abort(); state.loading?.abort();
  state.pending = null; state.loading = null;
}
function resetResults() { state.result = null; renderResults(); }
function renderCalls() {
  $("calls").replaceChildren();
  for (const call of state.calls) {
    const button = el("button", `call-button ${state.selected?.id === call.id ? "active" : ""}`);
    button.type = "button";
    button.setAttribute("aria-label", `Analyze ${call.name}, ${call.period}, ${call.date}`);
    button.setAttribute("aria-pressed", String(state.selected?.id === call.id));
    const top = el("div", "call-top");
    top.append(el("span", "ticker", call.ticker), el("span", "call-period", call.period));
    button.append(top, el("div", "call-name", call.name), el("div", "call-date", call.date));
    button.addEventListener("click", () => selectCall(call));
    $("calls").append(button);
  }
  $("call-count").textContent = state.calls.length;
}
async function loadCalls() {
  $("refresh").disabled = true;
  $("library-status").textContent = "Loading the latest transcripts…";
  try {
    const response = await fetch("/api/calls");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load calls.");
    state.calls = data.calls;
    renderCalls();
    const time = new Date(data.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    $("library-status").textContent = `Latest ${data.calls.length} listed · checked ${time}`;
  } catch (e) { $("library-status").textContent = e.message; }
  finally { $("refresh").disabled = false; }
}
async function selectCall(call) {
  cancel(); error(); state.selected = call; resetResults(); renderCalls();
  $("call-context").textContent = `${call.ticker} / ${call.period}`;
  $("call-title").textContent = call.name;
  $("call-subtitle").textContent = `Earnings conference call · ${call.date}`;
  $("source-link").href = call.source; $("source-link").hidden = false;
  $("call-text").value = "";
  $("editor-label").textContent = "Loading full transcript";
  $("transcript-panel").open = false;
  $("coverage").textContent = "Retrieving every speaker turn";
  $("result-meta").textContent = "Fetching the complete transcript from MarketBeat.";
  status("Loading transcript", "loading");
  const controller = new AbortController(); state.loading = controller; updateEditor();
  try {
    const response = await fetch(`/api/transcripts/${encodeURIComponent(call.id)}`, { signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load transcript.");
    if (state.loading !== controller) return;
    $("call-text").value = data.text;
    $("editor-label").textContent = "Full transcript";
    $("coverage").textContent = `${data.turns} speaker turns · full call`;
    state.loading = null; updateEditor();
    await analyze();
  } catch (e) {
    if (e.name === "AbortError") return;
    error(e.message); status("Transcript unavailable");
    $("editor-label").textContent = "Paste a transcript instead";
    $("coverage").textContent = "Transcript could not be retrieved";
    $("result-meta").textContent = "Select another call, retry this call, or paste its full text.";
  } finally {
    if (state.loading === controller) { state.loading = null; updateEditor(); }
  }
}
const positive = new Set(["strengthening", "broad_based", "improving", "gaining", "durable", "supported", "efficient", "raised", "ample", "contained", "disciplined", "shrinking", "concrete", "direct"]);
const negative = new Set(["weakening", "contracting", "pressured", "losing", "temporary_support", "recurring_exclusions", "opaque", "lagging", "timing_boost", "stressed", "lowered", "withdrawn", "conditional", "constrained", "elevated", "crystallizing", "aggressive", "diluting", "weak", "evasive"]);
const caution = new Set(["mixed", "narrow", "externally_driven", "material", "potential", "defensive", "partial"]);
function toneFor(id, option) {
  if (option === "unclear" || option === "no_comparison" || option === "no_qa") return "unknown";
  if (option === "limited") return id === "adjustments" ? "positive" : "negative";
  if (positive.has(option)) return "positive";
  if (negative.has(option)) return "negative";
  if (caution.has(option)) return "caution";
  return "balanced";
}
function renderResults() {
  const parent = $("metric-groups"); parent.replaceChildren();
  if (!state.config) return;
  for (const group of state.config.groups) {
    const section = el("section", "metric-section");
    const heading = el("div", "metric-section-head");
    heading.append(el("h3", "", group.label), el("p", "", group.description));
    section.append(heading);
    const list = el("div", "metric-list");
    for (const [id, question] of Object.entries(state.config.questions)) {
      if (question.group !== group.id) continue;
      const row = el("details", "metric-row");
      const summary = el("summary");
      const value = el("span", "metric-value");
      const answer = state.result?.answers[id];
      summary.append(el("span", "metric-name", question.label));
      if (answer) {
        const tone = toneFor(id, answer.choice);
        row.classList.add(`tone-${tone}`);
        value.append(el("span", `metric-choice tone-${tone}`, readable(answer.choice)),
          el("span", "probability", `${Math.round((answer.probabilities[answer.choice] || 0) * 100)}%`));
      } else value.append(el("span", "placeholder-value", state.result ? "Unavailable" : "Awaiting call"));
      const mark = el("span", "expand-mark", "+"); mark.setAttribute("aria-hidden", "true");
      value.append(mark); summary.append(value); row.append(summary);
      if (answer) {
        const meter = el("div", "meter");
        meter.setAttribute("role", "img");
        meter.setAttribute("aria-label", `${question.label} probability distribution: ${question.options.map(option => `${readable(option)} ${Math.round((answer.probabilities[option] || 0) * 100)}%`).join(", ")}`);
        const total = question.options.reduce((sum, option) => sum + (answer.probabilities[option] || 0), 0) || 1;
        for (const option of question.options) {
          const segment = el("span", `meter-segment tone-${toneFor(id, option)} ${option === answer.choice ? "is-selected" : ""}`);
          const probability = answer.probabilities[option] || 0;
          segment.style.width = `${probability / total * 100}%`;
          segment.title = `${readable(option)}: ${Math.round(probability * 100)}%`;
          meter.append(segment);
        }
        summary.append(meter);
      }
      const detail = el("div", "metric-detail");
      detail.append(el("p", "criterion", question.description));
      if (answer) detail.append(el("p", "decision-definition", question.criteria[answer.choice]));
      else if (state.result) detail.append(el("p", "criterion", "Jev returned no valid decision for this criterion."));
      if (answer) {
        for (const option of [...question.options].sort((a, b) => answer.probabilities[b] - answer.probabilities[a])) {
          const probability = answer.probabilities[option] || 0;
          const optionRow = el("div", `option-row tone-${toneFor(id, option)} ${option === answer.choice ? "is-selected" : ""}`);
          optionRow.title = question.criteria[option];
          const track = el("div", "option-track");
          const fill = el("div", "option-fill"); fill.style.width = `${probability * 100}%`; track.append(fill);
          track.setAttribute("aria-hidden", "true");
          optionRow.append(el("span", "option-name", readable(option)), track, el("span", "option-value", `${Math.round(probability * 100)}%`));
          detail.append(optionRow);
        }
      }
      row.append(detail); list.append(row);
    }
    section.append(list); parent.append(section);
  }
}
async function analyze() {
  if (!state.config) return;
  const text = $("call-text").value.trim();
  if (text.length < 80) return error("Paste at least 80 characters from a call.");
  if (text.length > state.config.maxCharacters) return error(`The full call exceeds the ${state.config.maxCharacters.toLocaleString()} character limit. It has not been truncated.`);
  if (!state.config.ready) {
    status("Transcript ready");
    $("result-meta").textContent = "The full transcript is loaded. Analysis is waiting for the OpenRouter connection.";
    $("transcript-panel").open = true;
    return error("Add the OPENROUTER_API_KEY Worker secret to enable analysis.");
  }
  state.pending?.abort();
  const controller = new AbortController(); state.pending = controller;
  error(); resetResults(); status("Jev is reading", "loading");
  $("result-meta").textContent = `Evaluating ${Object.keys(state.config.questions).length} criteria against ${text.length.toLocaleString()} characters of call text.`;
  updateEditor();
  try {
    const response = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }), signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analysis failed.");
    if (state.pending !== controller) return;
    state.result = data; renderResults();
    const valid = Object.values(data.answers).filter(Boolean).length;
    status(valid === Object.keys(state.config.questions).length ? "Analysis complete" : "Partial analysis", "ready");
    const time = new Date(data.analyzedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    $("result-meta").textContent = `${valid} decisions · ${data.model} · ${time}${data.usage?.inputTokens != null ? ` · ${data.usage.inputTokens.toLocaleString()} input tokens` : ""}`;
  } catch (e) {
    if (e.name === "AbortError") return;
    error(e.message); status("Analysis failed");
    $("result-meta").textContent = "The full transcript is still available. Open it to retry the analysis.";
    $("transcript-panel").open = true;
  } finally {
    if (state.pending === controller) { state.pending = null; updateEditor(); }
  }
}
function ownTranscript(clear = false) {
  cancel(); state.selected = null; error(); resetResults(); renderCalls();
  if (clear) $("call-text").value = "";
  $("call-context").textContent = "Your research / custom transcript";
  $("call-title").textContent = "Your earnings call";
  $("call-subtitle").textContent = "Paste the full prepared remarks and Q&A for a complete reading.";
  $("source-link").hidden = true;
  $("editor-label").textContent = "Your transcript";
  $("coverage").textContent = "User-supplied call text";
  $("result-meta").textContent = "Ready to evaluate your transcript against the same sixteen criteria.";
  status("Ready to analyze"); updateEditor();
}
$("refresh").addEventListener("click", loadCalls);
$("analyze").addEventListener("click", analyze);
$("paste").addEventListener("click", () => { ownTranscript(true); $("transcript-panel").open = true; $("call-text").focus(); });
$("call-text").addEventListener("input", () => ownTranscript());
async function initialize() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) throw new Error("Could not load the app configuration. Reload to retry.");
    state.config = await response.json();
    $("call-text").maxLength = state.config.maxCharacters;
    $("connection").textContent = state.config.ready ? "OpenRouter connected" : "API key needed";
    $("connection").className = `connection ${state.config.ready ? "ready" : ""}`;
    $("analysis-count").textContent = `${Object.keys(state.config.questions).length} criteria`;
    renderResults(); updateEditor();
  } catch (e) { error(e.message); $("connection").textContent = "Offline"; }
}
await Promise.all([initialize(), loadCalls()]);
