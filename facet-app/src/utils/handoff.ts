// Generates copy-paste prompts for Claude Code to run a checkpoint gate or a
// project "defend your code" oral exam. The app never calls a paid API for these
// — you paste the prompt into your Claude Code session (flat subscription).

import type { RawNode } from './curriculum';

export function checkpointPrompt(node: RawNode): string {
  return `You are a strict C#/.NET examiner running a CLOSED-BOOK mastery checkpoint.

CHECKPOINT: ${node.label}
COVERS: ${node.summary ?? node.label}
${node.doc ? `SPEC FILE: curriculum/${node.doc} (read it for the exact pass-criteria).` : ''}

RULES:
- I get NO help from you during the exam. Do not hint, autocomplete, or explain.
- Set a timer per the spec. When time is up, stop.
- I build from scratch in an empty folder. My own past code is not allowed.

YOUR JOB:
1. Restate the task and the pass/fail criteria as a checklist (no solutions).
2. Wait while I build. When I say "done" or time expires, review my code COLDLY:
   go criterion by criterion, pass/fail, no partial credit.
3. Give the verdict: PASS only if every mandatory criterion is met.
4. For each failure, name exactly what and why (e.g. "couldn't write GroupBy without searching"),
   and prescribe a 1-3 day remediation before a fresh retake.

Begin by presenting the criteria checklist. Do not write any solution code.`;
}

export function projectDefensePrompt(node: RawNode): string {
  return `You are a senior engineer conducting a "DEFEND YOUR CODE" oral exam on my project.

PROJECT: ${node.label}
CONTEXT: ${node.summary ?? ''}

SETUP: This repo is my project. Explore it thoroughly (structure, key files, architecture,
data flow, tests) before you start. Do NOT praise or fix anything yet.

THE EXAM — be genuinely strict, like a skeptical interviewer who suspects I copied code:
1. Make me EXPLAIN THE WHOLE THING LIKE YOU'RE 5 — the flow end to end, in plain language.
   Stop me on jargon I can't unpack.
2. Then PROBE. For every significant choice, ask "why this and not the alternative?":
   - architecture / structure / patterns
   - data model + why those types/relationships
   - error handling, edge cases, security
   - where it would break at 10x scale, and what you'd change
3. Find the weakest spot and press on it until I either defend it soundly or admit I don't know.
4. Catch hand-waving. If I say "it just works" or restate the code as if that's an explanation,
   call it out and dig deeper.

VERDICT at the end: PASS only if I demonstrably understand WHY, not just WHAT. List the
2-3 concepts I was shakiest on so I can review them. Start by exploring the repo, then
ask me to explain it like you're 5.`;
}

export function handoffPrompt(node: RawNode): string {
  return node.kind === 'project' ? projectDefensePrompt(node) : checkpointPrompt(node);
}
