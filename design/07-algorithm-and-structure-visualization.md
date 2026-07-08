# 07 · Algorithm & Data-Structure Visualization

This is a **first-class** part of Facet, not a sub-case of "runtime inspection." The
requirement: draw data structures as **boxes and arrows**, show pointers moving **one
step at a time**, and keep the diagram synchronized with the source and the values.

Two pieces do this: the **Structure card** (the picture) and the **Step sequence** (the
motion). They're wired together by the shared step cursor from
[`06-interaction-model.md`](06-interaction-model.md).

## The Structure card

Renders a `structure` (see [`05-data-model.md`](05-data-model.md)) as boxes + arrows,
laid out per `kind`. Pointer variables are drawn as **labeled arrows** aimed at boxes.

### Linked list
A node is a box split into `value | next`; `next` arrows point to the following box;
pointer variables (`head`, `prev`, `curr`, `next`) hang above as labeled arrows.

```
   head        prev        curr        next
    │           │           │           │
    ▼           ▼           ▼           ▼
 ┌─────┐     ┌─────┐     ┌─────┐     ┌─────┐
 │ 1 │•┼────▶│ 2 │•┼────▶│ 3 │•┼────▶│null │
 └─────┘     └─────┘     └─────┘     └─────┘
```

### Other kinds (same primitives, different layout)
```
 tree (BST)          array + index i         stack (top ptr)
    ┌8┐              ┌──┬──┬──┬──┐               top→┌ 7 ┐
   ┌┘ └┐            │ 3│ 5│ 8│ 9│                   ├ 4 ┤
  ┌3┐  ┌10┐         └──┴──┴──┴──┘                   ├ 9 ┤
  └┐    └┐               ▲                          └───┘
  ┌6┐   ┌14┐             i=2
```
`queue` (head/tail arrows) and `graph` (free node placement, labeled edges) follow the
same box-and-arrow vocabulary.

## The Step sequence

An algorithm becomes an ordered list of **Steps**. Each Step is a small declarative
patch (active line, pointer moves, edge rewires, node highlights, variable values, and a
one-line narration). Playing/scrubbing the cursor applies each patch to *all* cards.

### Authoring model (MVP)
Steps are **hand-authored or template-generated** — nothing has to execute:
- **By hand:** you add steps as you reason through the algorithm. *Writing the steps is
  itself the learning* — you can't hand-author the reversal without understanding it.
- **From a template:** pick "singly linked list · reverse" from the library and get a
  pre-built structure + step sequence to study and edit.

Auto-generating steps from a *real run* is a roadmap item (P3), not an MVP requirement —
see [`09-mvp-minimization.md`](09-mvp-minimization.md).

## Worked example — reverse a singly linked list, frame by frame

Source (line numbers are the `activeLine` anchors):

```csharp
1  Node prev = null;
2  Node curr = head;
3  while (curr != null) {
4      Node next = curr.Next;   // save the rest
5      curr.Next = prev;        // flip this link
6      prev = curr;             // advance prev
7      curr = next;             // advance curr
8  }
9  return prev;
```

**Step 0 — initial** (line 2): `prev=null, curr=1`
```
 prev            curr
  │               │
  ▼(null)         ▼
             ┌───┐   ┌───┐   ┌───┐
             │1│•┼──▶│2│•┼──▶│3│•┼──▶ null
             └───┘   └───┘   └───┘
```

**Step 1 — save next** (line 4): `next=2`
```
 prev            curr    next
  │               │       │
  ▼               ▼       ▼
             ┌───┐   ┌───┐   ┌───┐
             │1│•┼──▶│2│•┼──▶│3│•┼──▶ null
             └───┘   └───┘   └───┘
```

**Step 2 — flip this link** (line 5): `curr.Next = prev` → node 1 now points to null
```
 prev            curr    next
  │               │       │
  ▼               ▼       ▼
             ┌───┐   ┌───┐   ┌───┐
   null ◀────┼•│1│   │2│•┼──▶│3│•┼──▶ null
             └───┘   └───┘   └───┘
   ▲ node 1's arrow swung from 2 → null (highlighted)
```

**Step 3 — advance prev** (line 6): `prev=1`
```
         prev    curr    next
          │       │       │
          ▼       ▼       ▼
             ┌───┐   ┌───┐   ┌───┐
   null ◀────┼•│1│   │2│•┼──▶│3│•┼──▶ null
             └───┘   └───┘   └───┘
```

**Step 4 — advance curr** (line 7): `curr=2` … loop continues …

**Final** (line 9): `return prev` → `3 → 2 → 1 → null`
```
 head(returned)
  │
  ▼
 ┌───┐   ┌───┐   ┌───┐
 │3│•┼──▶│2│•┼──▶│1│•┼──▶ null
 └───┘   └───┘   └───┘
```

Each frame above corresponds to one `Step` object. As the cursor advances: the arrow
animates to its new target, the matching **source line** highlights, and the **Runtime
card** shows the current `prev/curr/next`. That triple-sync is the payoff.

## Prediction on algorithms
Because steps are discrete, you can predict a *specific* one: *"after step 2, is the list
broken?"* Lock it, step to 2, reveal. The surprise (it's re-rooted, not broken, because
`next` was saved first) is exactly the mental-model correction Facet is built to produce.

## Template library (starter reusable knowledge objects)
Ship a handful; each is a Structure + Step sequence you can open, study, and fork:
- Singly / doubly linked list — traverse, insert, **reverse**, delete
- Array — linear/binary search, in-place swap, a sort (e.g. insertion)
- Stack / Queue — push/pop, enqueue/dequeue
- BST — insert, search, delete (the three-case one)
- Graph — BFS / DFS traversal with a visited set

These *are* the "visualizations become reusable knowledge objects" principle: build or
fork one once, and it lives in your workspace forever, linkable to Concepts.
