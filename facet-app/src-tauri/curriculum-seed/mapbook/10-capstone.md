# Capstone

The capstone isn't new material — it's **the whole backend arc again, solo, bigger, against a real
spec**. Everything before this taught a piece; the capstone proves you can assemble the pieces into
one deployed, documented application without hand-holding. It's the centerpiece of your portfolio, so
treat it like a real project, not an exercise.

---

## 1. Spec & design (don't skip this)

Resist the urge to start coding. First write a short **spec** — one page is enough:

- **What it does** — the problem and the core user stories ("a user can create a project and add
  tasks to it").
- **The domain model** — the entities and their relationships (draw the tables + foreign keys, like
  the SQL chapter).
- **The API surface** — the endpoints, their methods, and who's allowed to call them (the AuthZ rules
  from the Auth chapter).
- **What's out of scope** — just as important; a capstone that tries to do everything finishes nothing.

Pick a domain you find *slightly* interesting but that's boring enough to be modelable: a habit
tracker, a recipe box, a small issue tracker, a personal finance log. Boring-but-real beats
clever-but-vague every time.

> **Try it (planning):** write the spec above for your chosen domain in one page. If you can't state
> the domain model and endpoints crisply, the idea is still too fuzzy to build — sharpen it first.

---

## 2. Build & test (vertical slices)

Build in **vertical slices**, not layers. Don't build "all the entities," then "all the endpoints."
Build *one complete feature* end to end — entity → migration → endpoint → validation → auth → test —
then the next. You always have something that works.

Carry forward every habit the arc taught:

- **DTOs + validation** at the boundary (ASP.NET chapter).
- **EF Core** with migrations, `Include` to avoid N+1, `AsNoTracking` for reads (SQL/EF chapter).
- **JWT auth + resource ownership** so users only touch their own data (Auth chapter).
- **`async`/`await` all the way** on every I/O path (Async chapter).
- **Unit/integration tests** for the logic that matters — enough that a reviewer trusts it, not 100%
  coverage theater.

> **Try it (build):** implement your *first* vertical slice completely — one entity you can create,
> read, and list, behind auth, with one test. Ship that before touching the second feature.

---

## 3. Ship & document

A capstone that isn't deployed and documented is a private repo nobody will read.

- **Deploy it** (Deployment chapter): Docker + CI + a public HTTPS URL + a managed database +
  `/health`. A live link is worth more than any description.
- **Write the README** — the document a reviewer (or future you) reads first:
  - one-paragraph *what and why*,
  - the **live URL** and how to run it locally (`docker run …`),
  - a short **architecture** note (the design decisions and *why not* the alternatives),
  - the API endpoints (or a link to the Swagger docs),
  - what you'd do next with more time (shows self-awareness).
- **Polish for reviewers**: clean commit history, no secrets in git, sensible folder structure,
  meaningful names.

## The bar to clear

You're done when a stranger can: open your README, understand the app in two minutes, click the live
URL and use it, read your code without wincing, and see tests that prove the important parts work. At
that point you haven't "finished a course exercise" — you've built and shipped software, which is the
entire thing employers are checking for.

## Defense (the checkpoint)

The capstone ends with a **"defend your code"** oral (hand the repo to Claude Code via the map's
project node). Expect: *"explain the whole flow like I'm five,"* and for every significant choice,
*"why this and not the alternative?"* — your schema, your indexes, where you killed an N+1, why JWT
over sessions, why these lifetimes. If you built it yourself and understood each decision as you made
it, the defense is a conversation, not an interrogation.
