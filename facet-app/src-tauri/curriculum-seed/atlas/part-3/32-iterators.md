# Iterators

`yield return`, custom `IEnumerable<T>` implementations, and lazy evaluation.

---

## Quick Summary

C#'s `yield return`/`yield break` let a method generate a lazily-evaluated sequence without manually implementing `IEnumerator<T>` — the compiler transforms the method into a state machine behind the scenes. This is a language-level feature with no equivalent in C, and a more ergonomic, general-purpose mechanism than Java (which requires implementing `Iterator<T>` manually, or using Streams for a comparable lazy-evaluation style).

---

## Syntax

```csharp
public IEnumerable<int> CountTo(int max)
{
    for (int i = 1; i <= max; i++)
        yield return i;
}

foreach (var n in CountTo(5))
    Console.WriteLine(n); // 1 2 3 4 5
```

---

## Syntax Variations

```csharp
// yield break — ends iteration early
public IEnumerable<int> TakeUntilNegative(IEnumerable<int> source)
{
    foreach (var n in source)
    {
        if (n < 0) yield break;
        yield return n;
    }
}

// Custom IEnumerable<T> implementation via explicit interface + iterator method
public class NumberRange : IEnumerable<int>
{
    private readonly int _start, _end;
    public NumberRange(int start, int end) => (_start, _end) = (start, end);

    public IEnumerator<int> GetEnumerator()
    {
        for (int i = _start; i <= _end; i++)
            yield return i;
    }

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
}

// IAsyncEnumerable<T> — async iterators (C# 8+)
public async IAsyncEnumerable<int> CountToAsync(int max)
{
    for (int i = 1; i <= max; i++)
    {
        await Task.Delay(100);
        yield return i;
    }
}
```

---

## Examples

```csharp
// Infinite sequences are safe because evaluation is lazy
public IEnumerable<int> Naturals()
{
    int i = 0;
    while (true)
        yield return i++;
}

foreach (var n in Naturals().Take(5)) // only pulls 5 values, never hangs
    Console.WriteLine(n);
```

```csharp
// Lazy evaluation means side effects run only as elements are consumed
public IEnumerable<int> LoggedRange(int max)
{
    for (int i = 1; i <= max; i++)
    {
        Console.WriteLine($"Producing {i}");
        yield return i;
    }
}

var seq = LoggedRange(3); // nothing printed yet — no execution until enumerated
foreach (var n in seq) { } // now "Producing 1/2/3" prints, interleaved with consumption
```

```csharp
// Consuming an async iterator
await foreach (var n in CountToAsync(3))
    Console.WriteLine(n);
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Generator syntax | ⭐ `yield return`/`yield break` | ❌ N/A | ❌ Not available — must implement `Iterator<T>` manually |
| Lazy evaluation | ⭐ Automatic via compiler-generated state machine | ❌ N/A | ⚠ Similar — Java Streams are lazy, but via a different, chain-based API, not generator syntax |
| Async iteration | ⭐ `IAsyncEnumerable<T>` + `await foreach` (C# 8+) | ❌ N/A | ❌ Not available natively (reactive streams libraries fill the gap) |
| Manual iterator implementation | Rare — `yield` covers nearly all cases | N/A | ✅ Common — `hasNext()`/`next()` implemented by hand |
| Infinite sequence support | ⭐ Safe by default due to laziness | ❌ N/A | ⚠ Similar — possible with Streams (`Stream.iterate`), less idiomatic |

---

## Common Patterns

- Use `yield return` to implement custom, lazily-evaluated sequences without hand-writing a state machine or full `IEnumerator<T>`.
- Combine `yield return` with LINQ (`Where`, `Select`, `Take`) — since both are lazy, chains only do as much work as the consumer actually requests.
- Use `IAsyncEnumerable<T>`/`await foreach` for streaming asynchronous data sources (paginated API results, database cursors).

---

## Common Mistakes

### Coming from C

Not applicable directly (C has no iterator protocol), but developers sometimes reach for manually-managed index/cursor state instead of the much simpler `yield return` model once they learn it exists.

### Coming from Java

Manually implementing `IEnumerator<T>` (`MoveNext`/`Current`/`Reset`) the way Java requires implementing `Iterator<T>` (`hasNext`/`next`). In C#, `yield return` eliminates almost all of this boilerplate — the compiler generates the state machine for you.

```csharp
// Unnecessary boilerplate translated from Java's Iterator pattern
// class MyIterator : IEnumerator<int> { /* MoveNext, Current, Reset... */ }

// Idiomatic C#
IEnumerable<int> MySequence()
{
    yield return 1;
    yield return 2;
}
```

---

## Performance Notes

- `yield return` compiles to a compiler-generated class implementing a state machine — there is a small allocation per iterator instance, but no per-element overhead beyond that.
- Laziness avoids unnecessary work and memory: `Naturals().Take(5)` only computes 5 elements, not an entire (potentially infinite) sequence.
- Multiple enumeration of an iterator method re-runs the method body from the start each time — cache results with `.ToList()`/`.ToArray()` if the sequence will be enumerated multiple times and recomputation is undesirable.

---

## Related Features

See also:
- Control Flow
- Generics
- LINQ
- async / await

---

## Best Practices

- Prefer `yield return` over manually implementing `IEnumerator<T>` unless you have unusual requirements the state machine can't express.
- Be mindful of multiple-enumeration costs — materialize with `.ToList()` when a sequence has expensive or side-effecting production logic and will be iterated more than once.
- Use `IAsyncEnumerable<T>` for naturally asynchronous, streaming data rather than forcing an eagerly-materialized `List<T>`.

---

## Common APIs

- `IEnumerable<T>`, `IEnumerator<T>`
- `IAsyncEnumerable<T>`, `IAsyncEnumerator<T>`
- `System.Linq.Enumerable`

---

## Notes

A method containing `yield return` doesn't execute any of its body until the returned sequence is actually enumerated (e.g., via `foreach` or `.MoveNext()`) — this "deferred execution" is a common source of surprise for code that expects eager side effects at call time.

---

## Official Documentation

- [Iterators](https://learn.microsoft.com/en-us/dotnet/csharp/iterators)
- [yield statement](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/yield)
- [IAsyncEnumerable&lt;T&gt; interface](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.iasyncenumerable-1)
