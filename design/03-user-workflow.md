# 03 · User Workflow

The whole tool exists to make one loop cheap and habitual:

> **Predict → Run/Step → Compare → Annotate → Link**

Everything else is scaffolding around this loop.

## The loop, step by step

| # | Step | What you do | What Facet does |
|---|------|-------------|-----------------|
| 1 | **Frame** | Start a Study; write the driving question | Creates a titled frame; a place for the cluster |
| 2 | **Source** | Paste/type a C# snippet into a Source card | Syntax-styles it; assigns line anchors |
| 3 | **Predict** | *Before* running, write what you expect | Stores prediction; locks it so you can't cheat |
| 4 | **Run / Step** | Run (manual/sim/live) **or** step the algorithm | Fills Runtime values; drives the shared step cursor |
| 5 | **Compare** | Look at prediction vs actual | **Diffs them and highlights the mismatch** |
| 6 | **Annotate** | Write a Note explaining the surprise | Anchors the note to the surprising card/line |
| 7 | **Link** | Connect the insight to a Concept | Grows the knowledge map; may reuse an existing Concept |

Steps 3 and 5 are the non-negotiable ones. A tool that skips "predict" and just shows
you the answer trains recognition, not understanding.

## Two entry patterns

**A. "I read some code and I'm not sure I get it."**
Paste into a Source card → predict the output/state → run (manual or simulated) →
compare → annotate the gap. Fast, low ceremony.

**B. "I want to really understand an algorithm."**
Source card + Structure card + Step sequence → predict a *specific step* ("after step 3,
`curr` = node 2") → scrub the steps and watch all views move together → annotate where
your pointer intuition failed → link to the Concept ("in-place reversal needs 3 pointers").

## Worked example — *Reverse a singly linked list* (pattern B)

This is the mockup's primary Study.

1. **Frame.** Study titled *"Reverse a singly linked list"*, question: *"What exactly
   happens to `next` on each node?"*
2. **Source.** Paste the classic three-pointer loop:
   ```csharp
   Node Reverse(Node head) {
       Node prev = null;
       Node curr = head;
       while (curr != null) {
           Node next = curr.Next;   // remember the rest
           curr.Next = prev;        // flip this link
           prev = curr;             // advance prev
           curr = next;             // advance curr
       }
       return prev;
   }
   ```
3. **Structure.** A `linkedlist` Structure card renders `1 → 2 → 3 → null` as boxes +
   arrows, with `prev`, `curr`, `next` as labeled pointer arrows.
4. **Predict.** In a Prediction card: *"After the first `curr.Next = prev`, node 1
   points to null and the list is temporarily broken."*
5. **Step.** Scrub the Step slider. On the flip step, node 1's arrow swings to `null`,
   the source line `curr.Next = prev;` highlights, and the Runtime card shows
   `prev=1, curr=2, next=2`. Your prediction was right about node 1 — but you might be
   surprised the list isn't "broken," it's *re-rooted*.
6. **Annotate.** Note: *"The list is never broken — `next` is saved first, so no node is
   ever unreachable mid-loop."*
7. **Link.** Draw a `demonstrates` link from the Note to a Concept *"Save-before-mutate
   when rewiring pointers."* That Concept now also links to your future BST-delete Study.

## Where the three runtime modes fit

- **Manual** (default): at step 4 you *type* the values. Slower — deliberately. Typing
  `prev=1, curr=2` forces you to actually track state.
- **Simulated**: canned values/steps play automatically. Good for a first pass or a
  concept you've already reasoned through. Clearly badged **SIMULATED**.
- **Live .NET** (roadmap): the same slots fill from a real Roslyn run. Toggle exists in
  the UI now, stubbed to the simulated data.

See [`06-interaction-model.md`](06-interaction-model.md) for the mechanics.

## The long game

Because every insight ends in a **Link to a Concept**, the workspace slowly becomes a
personal, spatial map of *what you actually understand and how you learned it* — which
is exactly what you can later review, quiz yourself on, or export (see
[`08-roadmap.md`](08-roadmap.md)).
