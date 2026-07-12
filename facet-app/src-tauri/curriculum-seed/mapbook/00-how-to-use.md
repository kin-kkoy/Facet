# How to Use This Book

This is the concept map as a **book** — something to read and learn *from* when you don't want
to lean on the internet or an AI. It follows the same order as the skill tree: work top to
bottom. Each chapter explains the *ideas*; the **Atlas** tab is the matching syntax reference,
and **Study** is where you actually run code.

## Who this is written for

This book assumes **you already program** and skips the absolute basics. Concretely, it's
pitched at where you are now:

- **From Java:** you're comfortable up to *inheritance*. So this book spends its energy on the
  OOP pillars you haven't nailed — **encapsulation, abstraction, polymorphism** — and on the
  places C# simply differs from Java (value types, properties, `ref`/`out`, nullability).
- **From C:** you know the common types, `struct`, `enum`, pointers, and header files. We reuse
  that: **structs and pointers are the best possible intuition for C#'s value-vs-reference
  split.** Where you've said pointers (especially pointer-to-pointer) still bite, we go slow and
  map them onto C#'s `ref`/`out` and reference semantics.
- **Both:** you've mostly written console toys, not *programs*. So every chapter ends with a
  "build something real" nudge — the goal is code you or a user would actually run.

Two things you flagged as weak — **file I/O** and **signed/unsigned + floating-point** — get
explicit sections rather than a passing mention.

## How to read a chapter

1. **The idea** — what the concept is and the mental model.
2. **From what you know** — the Java/C bridge, so you transfer instead of relearning.
3. **In C#** — the syntax that matters, with a runnable snippet. (Deeper syntax → the Atlas.)
4. **Gotchas** — the mistakes that actually happen.
5. **Build it** — a small real thing to make it stick.

Your toolchain is **.NET 10 (LTS)** and **C# 14** — modern C#: nullable reference types and
implicit `using`s are on by default, and top-level statements mean a file can be just code
(no `class Program { static void Main }` ceremony). Learn the fundamentals first; the newest
syntax sugar second.
