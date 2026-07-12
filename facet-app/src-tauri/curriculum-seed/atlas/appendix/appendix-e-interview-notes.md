# Appendix E — Interview Notes

Concise answers to frequently asked C#/.NET interview questions, framed for fast recall.

---

## Quick Summary

This appendix distills commonly asked conceptual questions into short, precise answers — useful for interview prep or quickly refreshing the "why" behind a feature, not just the "how" (covered on each feature's own page).

---

## "What's the difference between `struct` and `class`?"

`struct` is a value type (stored inline, copied on assignment/passing); `class` is a reference type (stored on the heap, assignment copies the reference). Structs cannot be `null` unless declared `T?`; they cannot participate in inheritance (except implicitly from `object` via boxing) but can implement interfaces.

---

## "What's the difference between `IEnumerable<T>` and `IQueryable<T>`?"

`IEnumerable<T>` represents an in-memory sequence evaluated with delegates (LINQ to Objects). `IQueryable<T>` builds an expression tree that a provider (e.g., EF Core) translates into another query language (SQL) before execution — filtering/sorting happens at the data source, not after loading everything into memory.

---

## "What is boxing and unboxing?"

Boxing wraps a value type in an `object` (or interface) reference, allocating it on the heap. Unboxing extracts the value type back out, with a runtime type check. Both carry allocation/casting overhead versus working with the value type directly — a common reason to prefer generics (`List<int>`) over non-generic collections (`ArrayList`).

---

## "What's the difference between `Task` and `Thread`?"

A `Thread` is a literal OS-level thread. A `Task` represents an asynchronous operation that may or may not run on a dedicated thread — many tasks (especially I/O-bound ones with `async`/`await`) complete without occupying a thread for their whole duration, making `Task` far more scalable for high-concurrency I/O workloads.

---

## "Explain `readonly` vs `const`."

`const` is a compile-time constant, inlined at compile time, and must be a value known at compile time (primitives, strings). `readonly` is assigned at runtime (in the constructor or field initializer) and can differ per instance or depend on runtime logic; it's resolved at the field's containing type's actual memory location, not inlined into callers.

---

## "What's the difference between `override` and `new` on a method?"

`override` participates in virtual dispatch — calling the method through a base-class reference still invokes the derived implementation. `new` hides the base member entirely — calling through a base-class reference invokes the base implementation, while calling through a derived reference invokes the new one. `new` breaks polymorphism and is rarely the right choice.

---

## "What is the difference between `Equals()` and `==`?"

For reference types, `==` by default compares reference identity unless overloaded; `Equals()` can be overridden to provide value equality. For value types (structs), both typically compare value equality by default, though `==` requires either a built-in definition or an explicit operator overload — structs don't get `==` for free unless it's manually defined (records generate this automatically).

---

## "What does `async`/`await` actually do under the hood?"

The compiler transforms an `async` method into a state machine. Each `await` point becomes a suspension point: if the awaited task isn't complete, the method returns control to its caller immediately, and a continuation is scheduled to resume the state machine when the task completes — no thread is blocked waiting.

---

## "What's the difference between deep copy and shallow copy?"

A shallow copy duplicates the top-level object but its reference-type fields still point to the same underlying objects as the original. A deep copy recursively duplicates every referenced object as well, so the copy is fully independent. C# doesn't clone deeply by default (`MemberwiseClone()` is shallow) — deep copying requires custom logic or serialization round-tripping.

---

## "Why prefer `IEnumerable<T>` parameters over `List<T>` in method signatures?"

Accepting the least specific interface needed (`IEnumerable<T>`) maximizes caller flexibility — any collection, LINQ query, or generator can be passed in without forcing a conversion. Return the most specific type useful to the caller instead, following the general "be liberal in what you accept, specific in what you return" principle.

---

## "What is the purpose of `CancellationToken`?"

It provides a cooperative cancellation signal threaded through async call chains, letting long-running operations observe a cancellation request and stop gracefully (throwing `OperationCanceledException`) rather than being forcibly terminated.

---

## Related Features

See also:

* Structs
* LINQ
* Tasks
* async / await
* Cancellation

---

## Official Documentation

* [C# programming guide](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/)
