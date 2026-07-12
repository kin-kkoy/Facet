# Appendix D — Performance Tips

A consolidated reference of modern .NET performance guidance across the language and BCL.

---

## Quick Summary

Most C#/.NET performance work centers on reducing allocations (and therefore GC pressure), choosing the right collection/data structure, and avoiding unnecessary boxing or synchronous blocking in async code. This appendix consolidates tips referenced throughout the atlas into one lookup page.

---

## Allocations & GC

* Prefer `struct` for small, short-lived, immutable data to avoid heap allocation — but avoid large structs (>16 bytes is a common rule of thumb) passed by value repeatedly, since copying becomes the new cost.
* Use `Span<T>`/`ReadOnlySpan<T>` to slice arrays/strings without allocating new copies.
* Avoid boxing value types into `object`/non-generic collections — use generic collections (`List<T>`, `Dictionary<TKey,TValue>`) instead of `ArrayList`/`Hashtable`.
* Use `StringBuilder` for building strings in loops instead of repeated `string` concatenation (`string` is immutable; each `+` allocates a new string).
* Use object pooling (`ObjectPool<T>` from `Microsoft.Extensions.ObjectPool`) for expensive-to-allocate, frequently reused objects in hot paths.

---

## Collections

* Choose `Dictionary<TKey,TValue>` for O(1) average lookups over `List<T>.Find`/linear scans.
* Use `HashSet<T>` for membership checks instead of `List<T>.Contains` (O(1) vs O(n)).
* Pre-size collections (`new List<T>(capacity)`) when the approximate final size is known, to avoid repeated internal array resizing.
* Prefer `IReadOnlyList<T>`/`IReadOnlyCollection<T>` in public APIs to signal immutability intent without forcing a full immutable collection's overhead.

---

## Async & Concurrency

* Use `Task.Run` only for CPU-bound work; call async I/O APIs directly rather than wrapping them.
* Avoid `.Result`/`.Wait()` — always `await`, to prevent thread-pool starvation and potential deadlocks.
* Use `ConfigureAwait(false)` in library code to skip capturing the synchronization context.
* Use `ValueTask<T>` in hot paths where results are frequently available synchronously, to avoid `Task<T>` allocation overhead — but don't await a `ValueTask` more than once.
* Bound parallel work (`Parallel.ForEach` with `MaxDegreeOfParallelism`, or `SemaphoreSlim`) to avoid oversubscribing shared thread-pool capacity.

---

## LINQ & Iteration

* Materialize (`.ToList()`) query results that are enumerated multiple times, since `IEnumerable<T>` queries re-execute their pipeline on each enumeration.
* Avoid `.Count()` for existence checks — use `.Any()`, which short-circuits.
* For very hot loops, a hand-written `for`/`foreach` loop can outperform a LINQ chain due to avoided delegate invocation and iterator overhead — measure before optimizing away readability.

---

## Strings & Serialization

* Use `System.Text.Json` over `Newtonsoft.Json` for new code — it operates on UTF-8 bytes directly and avoids many intermediate allocations.
* Use source-generated JSON serialization (`JsonSerializerContext`) in AOT/trimmed or high-throughput scenarios to eliminate reflection.
* Use string interpolation (`$"..."`) for readability in non-hot paths; use `StringBuilder` in loops or hot paths building large strings incrementally.

---

## Nullable & Pattern Matching

* Nullable Reference Types add zero runtime cost — enable them freely; they're purely compile-time analysis.
* Pattern-matching type checks compile to efficient `isinst` IL instructions — no reflection overhead versus manual casting.

---

## Common Mistakes

* Assuming `struct` is always faster than `class` — large structs copied frequently by value can be slower than a reference type due to copy cost.
* Wrapping every I/O call in `Task.Run` "to make it async" — this wastes a thread-pool thread waiting on I/O that could have been awaited directly.
* Premature micro-optimization without profiling — always measure (e.g., with BenchmarkDotNet) before assuming a given pattern is a bottleneck.

---

## Related Features

See also:

* Tasks
* async / await
* Structs
* Serialization
* LINQ

---

## Official Documentation

* [Performance and reliability best practices](https://learn.microsoft.com/en-us/dotnet/core/extensions/performance)
* [BenchmarkDotNet](https://learn.microsoft.com/en-us/dotnet/core/testing/) *(profiling and micro-benchmarking guidance)*
