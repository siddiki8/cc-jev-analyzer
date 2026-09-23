# Research workspace redesign

Reading this as: a compact research workspace for public-market investors, with a restrained, precise visual language.

## Audit

The original interface uses near-black green, lime, oversized display copy and repeated cards. Its vertical layout separates transcript selection from results, and expanded probabilities make scanning slow. Preserve full-call retrieval, source links, editable text, OpenRouter configuration and bounded Jev judgments. Retire the hero, numbered steps, static three-call selection and decorative card chrome. Preserve the page title and descriptive metadata; this is a utility page, not an SEO landing page.

The design-taste skill explicitly excludes dense product dashboards. Apply its audit, accessibility and visual-quality guidance; use frontend-design for this native HTML/CSS product workspace. No framework migration is needed.

## Direction

- DESIGN_VARIANCE 4: a distinct blue library rail, quiet results sheet.
- MOTION_INTENSITY 2: short state transitions, no decorative animation.
- VISUAL_DENSITY 7: ten selectable calls and sixteen compact, expandable signals.
- Public Sans, self-hosted; tabular numbers for probabilities.
- White surfaces, near-black text, restrained cobalt navigation and semantic colors in the analysis only.
- Probability bars stay visible for every completed metric. Chosen answers have colored labels and row cues.
- One call selection starts retrieval and analysis. A separate paste action opens the same transcript editor.

## Layout

```text
Brand                      Jev connection
---------------------------------------------------
Latest calls   | Company / period             Status
MarketBeat     | Full transcript / Analyze again
               |-----------------------------------
KBH            | Business momentum  | Earnings / cash
AYTU           | 4 expandable rows  | 4 rows
...            |-----------------------------------
10 calls       | Outlook / risk     | Capital / answers
               | 4 rows             | 4 rows
Paste a call   | Source / model / scope
```

At narrow widths the call library sits above the workspace in a bounded scrolling list; results become one column. Transcript editing stays in a disclosure above results. Selection and focus are distinct. Loading, source failures, missing key, empty results and edited-input states have explicit text. New calls clear previous results so company labels never describe another company's analysis.

## Review

Avoid a giant hero, all-caps microcopy and invented scores. Use compact disclosure rows with a visible probability bar and selected answer; definitions and all options are available on demand. Percentages describe the model's answer distribution, not investment-return probabilities.
