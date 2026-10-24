// Collects every model output the scorer needs. Results are cached under results/raw,
// so a rerun only fills in what is missing. Usage: node --env-file=.dev.local evals/run.js [--jev-only|--labels-only] [ticker...]
import { cached, label, loadTranscripts, pool, PERTURBATIONS, runJev } from "./lib.js";

const JUDGE_SAMPLES = 3;
const flags = new Set(process.argv.slice(2).filter((arg) => arg.startsWith("--")));
const only = process.argv.slice(2).filter((arg) => !arg.startsWith("--")).map((ticker) => ticker.toUpperCase());
const transcripts = (await loadTranscripts()).filter((t) => !only.length || only.includes(t.ticker));

async function jevRuns(transcript) {
  for (const [name, perturb] of Object.entries(PERTURBATIONS)) {
    const result = await cached(`jev-${transcript.ticker}-${name}`, () => runJev(perturb(transcript.text)));
    console.log(`${transcript.ticker} jev ${name}: ${result.error ?? `$${result.usage?.cost?.toFixed(4)}`}`);
  }
}

async function labelRuns(transcript) {
  const human = await cached(`human-${transcript.ticker}`, () => label("human", transcript, 0));
  console.log(`${transcript.ticker} human (${human.model}): $${human.cost.toFixed(3)}`);
  // Sequential so samples 2 and 3 read the transcript from the prompt cache.
  for (let seed = 1; seed <= JUDGE_SAMPLES; seed++) {
    const judge = await cached(`judge-${transcript.ticker}-${seed}`, () => label("judge", transcript, seed));
    console.log(`${transcript.ticker} judge #${seed} (${judge.model}): $${judge.cost.toFixed(3)}, cache read ${judge.usage.cache_read_input_tokens ?? 0}`);
  }
}

await Promise.all([
  flags.has("--labels-only") || pool(transcripts, 3, jevRuns),
  flags.has("--jev-only") || pool(transcripts, 4, labelRuns),
]);
console.log("done");
