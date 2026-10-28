# Independent conversation oracle

The observable oracle is the ordered parsed tool trace, preserved original arguments,
and conservative text evidence against checked-in portfolio facts. A passing text
heuristic is not semantic proof: the owner reviews the unedited synthetic transcript.
Runtime, prompt and UI authors must not edit this corpus or bless their own output.

Corpus: `tests/fixtures/agent-eval.json`, 13 cases, SHA-256 of UTF-8/LF bytes
`12ed489da80afb998549e3d45119ec551b5c86491ea70b78270d846a3dab4037`.
CRLF checkout bytes are normalized only for hashing. Inputs and expectations are frozen;
changes require independent author and owner review, never a prompt-diet accommodation.
`requiredTools` is ordered; `oneOf` allows equivalent targeted actions. `allowedPanels`
is an allowlist (empty means none; null means unrestricted). `factSources` identify
checked-in portfolio records, relative to `portfolio/` unless stated otherwise.

Measured source is `205199c5c38f8d13dc34e1486eee91fcf356ad9c`.
The Orchestrator confirmed its only difference from prior `b17d3fb` is static loop assets.
Reports distinguish `production_source_sha` and `harness_sha`, and record prompt hash/bytes.
Keep baseline and final reports separately for each model/effort. Do not overwrite reports.
An integrated source change must be measured as an after report, never relabeled baseline.

## Commands and evidence

```sh
pnpm install --frozen-lockfile
pnpm --filter @ai-portfolio/andrey eval:agent
pnpm --filter @ai-portfolio/andrey exec vitest run tests/api-chat.test.ts tests/spotlight.test.ts
pnpm --filter @ai-portfolio/andrey eval:agent:live --out /ABS/PAD/current-before.json --repetitions 2
AI_MODEL=grok-4.3 AI_REASONING_EFFORT=none pnpm --filter @ai-portfolio/andrey eval:agent:live --out /ABS/PAD/grok43-none-before.json --baseline /ABS/PAD/current-before.json --repetitions 2
```

Use environment variables in the process only. On Windows, load the authorized canonical
gitignored `.env.local` into one command's process without printing values or copying it.
The harness reads `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_REASONING_EFFORT`; existing
`XAI_API_KEY`, `XAI_BASE_URL`, `XAI_MODEL` fallbacks remain available through real ai-config.
No key is accepted on argv or included in reports. Missing key exits 2 with status
`unavailable`; oracle failures exit 1; all acceptance cases passing exits 0. Interrupted
reports remain `running` and cannot count as complete evidence. No retry is automatic.

Exactly two sequential repetitions for 13 cases means 26 turns per variant. Each turn
has a 60-second total abort deadline and at most six upstream rounds. This comparison
uses current alias/current effort and `grok-4.3`/`none`, 52 turns total. No third candidate
was selected or verified. Any separately owner-selected third candidate must first be
verified in the current authoritative catalog; the comparison batch cap remains three
variants / 78 turns including failures. Never rerun failures silently or raise bounds.

The runner uses the real local prompt wrapper, enriched core tools, `runAgentLoop` and
`parseStream`. It passes the explicit package base path and sets package cwd for the
unchanged wrapper. The integrated wrapper must honor its optional basePath. A test-only
fetch adapter forwards real SSE bytes while adding optional effort and include_usage
for the old loop. `enableJev:false` is explicit. No classifier is imported as a grader.
Tools receive the production loop's acknowledgement but are never executed: no visitor
mutation, secondary insight/match/showtime request, quota consumption in the app, or
secret-bearing browser request. This is production model tool choice/transport evidence,
not route middleware or rendered UI coverage.

Every turn preserves raw upstream SSE, ordered parsed events, per-round requested and
returned canonical model IDs, effort, errors, usage, tool counts and timings. Metrics:

| Field | Observable fact |
| --- | --- |
| firstToolNameMs | First upstream delta with a nonempty function name; may still be partial |
| firstCompleteValidToolMs | Production parser delivers a complete call valid against actual tool schema |
| firstTextMs | First parsed non-whitespace text, excluding reasoning |
| endMs | End/error relative to turn submission, including tool follow-up rounds |
| cachedTokens | Sum of provider `usage.prompt_tokens_details.cached_tokens`; null if any round lacks it |
| cacheState | warm if known sum > 0, cold if known sum = 0, otherwise unknown |
| observedUsd | Sum `usage.cost_in_usd_ticks / 10^10`; null when absent in any round |

There is no local tokenizer. Usage-only SSE frames are retained by the independent raw
observer even when the baseline parser ignores them. Raw usage remains authoritative;
unknown cache is never fabricated zero. Repetition 1 is not assumed cold, nor repetition
2 warm. Reports include median/nearest-rank p95 globally, per case and by actual cache
state, with sample/unknown counts; two-sample p95 is simply the slower observation.
Paired comparisons retain both failure sets and cache states beside metric deltas.
API metrics must never be called rendered latency.

Official provider references checked 2026-10-28:
[Grok 4.3 model and rates](https://docs.x.ai/developers/models/grok-4.3),
[pricing](https://docs.x.ai/developers/pricing),
[cost ticks and streaming usage](https://docs.x.ai/developers/cost-tracking).
Grok 4.3 short-context rates per million tokens: input $1.25, cache $0.20, output $2.50;
at 200K input tokens the rates double. The requested retired alias is never assigned
its old price. Estimate only a recognized returned canonical model with known usage/cache;
unknown model/rates remain null. Prefer observed billed ticks, which include reasoning.
Retain raw completion/total/reasoning token fields so provider accounting differences
remain reviewable. The original before artifacts from harness `37ca4d6` underestimated
the current variant by excluding separately accounted reasoning tokens from estimatedUsd;
their observedUsd is correct. `comparison-review.json` preserves raw artifact hashes and
derives corrected estimates using max(completion_tokens, total_tokens - prompt_tokens).
The runner now uses this accounting, with a regression test. Raw before files remain
unchanged and no live turn was repeated. Production model changes require owner approval.

## Deterministic red/green

`tests/agent-eval.test.ts` rejects wrong tool, slug, visitor name, late spotlight,
invented cross-machine memory/Kafka claims, overwritten JD/Job Match, missing SOS depth,
unchecked contact links, irrelevant Python panels and repeated identity requests before
accepting independently authored valid traces. A forced always-pass grader was actually
run and produced 12 failed tests (exit 1); restoring the grader passed the focused suite.
The local streamed adapter test exercises the real loop/parser, effort forwarding,
usage-only frames, returned-model identity, cached tokens and measured tool/text times.
These synthetic adapter results are transport proof, not live model acceptance.
Existing resume/recommendations/gallery/theme/insight/showtime handlers are exercised
without executing secondary analysis. Per-file jsdom and automatic JSX are proved by
rendering the actual core ChatMessage component; project default environment is unchanged.

## Watched browser protocol (Orchestrator integration gate)

The Orchestrator owns first-visible baseline and final user-layer evidence. Start
`pnpm --filter @ai-portfolio/andrey dev` in a Team utility shell with purpose `dev`.
Use identical before/after process-only empty `KV_REST_API_URL` and
`KV_REST_API_TOKEN` (and verify the current store/rate-limit env names in source).
Do not modify production Redis or quota settings. Verify
`git check-ignore packages/andrey/data/visitors.json` exits 0. This uses the existing
local fallback. Preserve and label the storage/observer settings for every artifact.

```sh
domios plugin browser status
domios plugin browser open --profile clean
domios plugin browser goto http://localhost:3000
domios plugin browser snapshot
domios plugin browser endpoint
node packages/andrey/scripts/browser-emulation.mjs --endpoint DOMIOS_ENDPOINT --url http://localhost:3000 --width 390 --height 844 --mobile true --scheme dark --motion reduce
domios plugin browser snapshot
```

Run `open` only when status says none. Never launch a separate browser. The helper uses
native Node22 WebSocket, a 10-second total connection/command deadline and only the
existing local Domios endpoint. It refuses zero/ambiguous matching page targets.
It attaches one session, sets device metrics and color-scheme/reduced-motion media,
then detaches. It prints only URL, settings and pass; no endpoint/credentials.
Desktop recipe: `--width 1280 --height 900 --mobile false --scheme light --motion no-preference`.
Run the phone/desktop recipes with both schemes and reduced-motion variants as assigned.
Restore with `node packages/andrey/scripts/browser-emulation.mjs --endpoint DOMIOS_ENDPOINT --url http://localhost:3000 --restore` and re-snapshot.
Successful CDP acknowledgements prove applied overrides; screenshots and visible checks
are separate evidence of actual layout and response behavior.

Fresh sessions per primary case: use New chat, re-snapshot, and confirm prior messages
are absent before submission. Use the current snapshot textbox ref, type the exact frozen
input, then press Enter. For followup preserve the identity-case history and record the
actual assistant history separately from the fixed API fixture history. Record timestamps
with the same monotonic observer before/after, beginning at submission. Loading/reasoning
does not count. Condition-wait for `.prose > :first-child` for new substantive assistant
text (scope to the new message so prior text cannot satisfy it); for requested panels,
wait for the actual observed panel title/content. Re-snapshot to confirm stable content.
No sleeps. A Domios wait has a 15-second bound; report expiration, never silently retry.
Record CLI dispatch/observer overhead and observation interval separately; a snapshot's
completion timestamp is an upper bound, not an exact render timestamp.

| Case | Visible panel/text pass condition |
| --- | --- |
| hello | Concise greeting appears, no forced panel |
| domios | Domios spotlight is first substantive action; local shared memory and cross-machine roadmap stated |
| rekap | REKAP project panel with grounded narration |
| python | Skills panel, Python highlighted; no insight/radar |
| leadership | Leadership-filtered projects; SOS 17-person team and grounded Performica facts |
| job | Job Match opens before prose, preserves full original JD/role/company, remains active with no second panel tool |
| identity | Synthetic Alex / CTO / ExampleCo fields retained; LLM consulting response |
| followup | Context retained, assessment/architecture/training proposed; no repeated identity request or job-seeker pitch |
| trax | Timeline targets Trax Retail; substantive Russian response |
| contact | Contact panel, only checked-in contact links |
| kafka | Explicit absent/unverified production Kafka evidence; no invented expertise |
| snake | Snake game visible |
| sos | SOS Portal panel retains full writeup; chat explains Brazil COVID healthcare, led 17, ASP.NET / React Native; honest detail limits if relevant |

Timing template (one row per attempt; retain errors and screenshots):

| source/harness SHA | corpus hash | model/effort | case/rep | viewport/mobile/scheme/motion | storage env | observer/version | submit timestamp | first visible text | first requested panel | stable snapshot/screenshot | dispatch/observer overhead | error/pass |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## CI prerequisites and final integration commands

Fork PRs run offline only. Same-repository PRs, default-branch pushes and default-branch
workflow dispatch may run the protected `agent-eval-live` environment job. Repository
owners must configure that environment with required reviewers and trusted branch rules
before adding secrets. YAML alone does not configure environment protection. Secrets:
`AI_API_KEY` required; `AI_BASE_URL`, `AI_MODEL`, `AI_REASONING_EFFORT` represent the actual
deployed configuration (empty values use documented provider fallbacks). No Jev secret
is needed. Jobs have read-only contents permission, frozen lockfile, bounded concurrency,
timeouts and synthetic artifact upload even on failure. No `pull_request_target`.
Missing key produces a failed unavailable report, never a green skipped live result.

The separate explicit workflow_dispatch candidate matrix contains only `grok-4.3`/`none`.
It downloads the complete current report, compares 26 paired turns and cannot change
production configuration. A failed current acceptance can still supply complete baseline
evidence for comparison; missing/incomplete baseline prevents candidate execution.
CI execution and repository protection remain outstanding until observed remotely.

At integration run the three offline commands above once, then capture separate
`current-after.json` against `current-before.json` using the same model and effort, and
`grok43-none-after.json` against its matching candidate-before report using process-only
overrides. The Orchestrator alone runs the final combined full suite/build, visible
matrix, owner trial and production-model approval. Do not equate local command success
with an observed GitHub job or owner acceptance.
