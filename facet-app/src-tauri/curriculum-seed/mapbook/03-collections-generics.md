# Collections & Generics

Nearly every real program shuffles data through collections, and picking the right one is mostly
Big-O reasoning you already do in C — except C# hands you the containers. Choosing well is the
difference between code that's O(n) and code that's accidentally O(n²).

---

## 1. The five you'll actually use

| Type | Reach for it when… | Key ops (avg) | Mental model |
|---|---|---|---|
| `List<T>` | ordered, growable sequence | index O(1), add O(1)*, search O(n) | a growable C array |
| `Dictionary<TKey,TValue>` | look up a value by a key | get/add O(1) | a hash map |
| `HashSet<T>` | uniqueness / "seen it?" | add/contains O(1) | a set |
| `Queue<T>` | first-in-first-out | enqueue/dequeue O(1) | a pipe (BFS, work queues) |
| `Stack<T>` | last-in-first-out | push/pop O(1) | a spring (undo, DFS) |

\*amortised — occasionally the list doubles its backing array.

```csharp
var counts = new Dictionary<string, int>();
foreach (var w in new[] { "a", "b", "a", "c", "a" })
    counts[w] = counts.TryGetValue(w, out var n) ? n + 1 : 1;   // → a:3, b:1, c:1

var seen = new HashSet<int>();
bool isNew = seen.Add(42);        // Add returns false if it was already present

var work = new Queue<string>();
work.Enqueue("job1"); work.Enqueue("job2");
string next = work.Dequeue();     // "job1"
```

**The single most common mistake:** scanning a `List` to check membership inside a loop. That's an
O(n) inside an O(n) → O(n²). The instant you catch yourself doing `list.Contains(x)` in a loop,
switch to a `HashSet`. **Use-cases:** `Dictionary` for lookups/caches/counting; `HashSet` for dedup
and membership; `Queue` for breadth-first traversal and task pipelines; `Stack` for undo and
depth-first work.

> **Try it (lab):** given a `List<int>` with duplicates, remove duplicates two ways — a nested loop
> (feel the O(n²)) and `new HashSet<int>(list)`. Then time both on a big list.

*(Atlas: **Arrays**, **List<T>**, **Dictionary<TKey,TValue>**, **HashSet<T>**, **Queue<T>**, **Stack<T>**.)*

---

## 2. Generics — the part C never had

In C you fake "a stack of anything" with `void*` and lose all type safety (and pay for casts).
Java has generics, so this will feel familiar — but with a crucial difference: **C# generics are
real at runtime** (no type erasure). `List<int>` genuinely stores `int`s (no boxing), and a generic
method actually knows its `T`.

A generic type/method is parameterised by a type you fill in later:

```csharp
T Max<T>(T a, T b) where T : System.IComparable<T>   // constraint: T must be comparable
    => a.CompareTo(b) >= 0 ? a : b;

int    m = Max(3, 7);           // T inferred as int
string s = Max("ab", "az");     // and as string — same code, type-safe both times
```

The `where` **constraint** is the whole point: it tells the compiler what `T` can *do*, so the
method can use it instead of treating it as an opaque blob. Common constraints:

```csharp
where T : class            // T is a reference type
where T : struct           // T is a value type
where T : new()            // T has a public parameterless constructor (you can `new T()`)
where T : IComparable<T>   // T implements an interface
where T : Animal           // T derives from Animal
```

**Use-case:** you write a `Repository<T>` or a `Cache<TKey,TValue>` *once* and it works, type-safe,
for every entity. That reuse-without-casting is why the whole collections library is generic.

> **Try it (lab):** write `T[] Repeat<T>(T value, int n)` that returns an array of `n` copies. Call
> it for `int` and for `string` with no casts. Then add `where T : new()` to a different method and
> `new T()` inside it.

*(Atlas: **Generics**.)*

---

## 3. Iterators — produce a sequence lazily

`yield return` lets a method hand back items **one at a time** without building a whole list in
memory — the caller pulls values as it iterates. This is the foundation LINQ (next chapter) stands
on:

```csharp
System.Collections.Generic.IEnumerable<int> Evens(int upTo)
{
    for (int i = 0; i <= upTo; i += 2)
        yield return i;              // nothing runs until someone iterates
}

foreach (var e in Evens(10)) System.Console.Write($"{e} ");   // 0 2 4 6 8 10
```

`IEnumerable<T>` is the "can be `foreach`-ed" contract; almost everything sequence-shaped implements
it. Because it's lazy, `Evens(1_000_000).Take(3)` computes only three numbers — it never builds a
million-element list. **Use-case:** streaming rows from a file or database, or generating an
infinite/large sequence you only partly consume.

> **Try it (lab):** write an iterator `Fibonacci()` with no upper bound (`while (true) yield return`)
> and pull the first 10 with `.Take(10)`. Prove the infinite loop doesn't hang — laziness stops it.

*(Atlas: **Iterators**.)*

---

## 4. Equality — so sets and dictionaries behave

`Dictionary` and `HashSet` find items by **hash code + equality**, so for value-like keys those must
be consistent. Two rules:

- A **`class`** uses *reference* equality by default — two objects with identical fields are "not
  equal." Right for identity, wrong for "two points at the same coordinates are the same point."
- If you need value equality, either override `Equals` **and** `GetHashCode` together (never one
  without the other — it silently breaks dictionaries), or far better, use a **`record`**, which
  generates both correctly.

```csharp
record Point(int X, int Y);
var set = new HashSet<Point> { new(1, 2), new(1, 2) };   // count is 1 — value equality works
```

*(Atlas: **Equality**.)*

---

## Performance notes

- **Give collections a capacity when you know the size:** `new List<int>(10_000)` /
  `new Dictionary<..>(capacity)` avoids repeated re-allocations as they grow.
- **`Dictionary`/`HashSet` are O(1) *average*, O(n) worst** (hash collisions). With sane keys you'll
  never notice; with a bad `GetHashCode` they degrade to a linked list.
- **Boxing sneaks in** with the *non-generic* legacy collections (`ArrayList`, `Hashtable`) — never
  use those; the generic ones don't box value types.
- **`List` indexing is O(1); `List.Contains`/`Remove(item)`/`Insert(0,…)` are O(n).** If you do lots
  of membership tests or front-insertions, you picked the wrong structure.

## Build it (make the chapter real)

Write a **word-frequency + report** tool (a real one):

1. Read a text file line by line (streaming — you practised this in Fundamentals).
2. Count words in a `Dictionary<string,int>`, skipping stop-words held in a `HashSet<string>`.
3. Print the top 10 by count.
4. Make one method **generic** — `IEnumerable<(T item, int count)> TopN<T>(IEnumerable<T> items, int n)`
   — so it works for words, characters, or anything comparable, not just strings.

If your dedup uses a set (not a nested loop) and your `TopN` compiles for both `string` and `char`
without a cast, you own this chapter.
