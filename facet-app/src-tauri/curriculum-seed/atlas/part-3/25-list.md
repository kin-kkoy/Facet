# List&lt;T&gt;

The dynamically-sized generic list.

---

## Quick Summary

`List<T>` is C#'s general-purpose, resizable, generic collection — backed internally by an array that doubles in capacity as needed. It's the direct analog of Java's `ArrayList<T>` and roughly the equivalent of a growable array in C (which requires manual `realloc` management). `List<T>` implements `IList<T>`, `IEnumerable<T>`, and several other collection interfaces.

---

## Syntax

```csharp
List<int> numbers = new List<int>();
List<int> initialized = new List<int> { 1, 2, 3 };
List<int> inferred = new() { 1, 2, 3 };
```

---

## Syntax Variations

```csharp
// Collection expression (C# 12+)
List<int> nums = [1, 2, 3];

// With initial capacity (avoids repeated internal resizing)
var list = new List<int>(capacity: 1000);

// Creating from another sequence
var fromArray = new List<int>(new[] { 1, 2, 3 });
var fromLinq = Enumerable.Range(1, 5).ToList();
```

---

## Examples

```csharp
// Common operations
var list = new List<string> { "a", "b", "c" };
list.Add("d");
list.Insert(0, "start");
list.Remove("b");
list.RemoveAt(0);
bool has = list.Contains("c");
int index = list.IndexOf("c");
```

```csharp
// Sorting and searching
var numbers = new List<int> { 5, 3, 1, 4, 2 };
numbers.Sort();                          // in-place sort
numbers.Sort((a, b) => b.CompareTo(a));  // custom comparer, descending

int found = numbers.BinarySearch(3);     // requires sorted list
```

```csharp
// Converting to/from arrays
List<int> list2 = new() { 1, 2, 3 };
int[] array = list2.ToArray();
List<int> backToList = array.ToList();
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Dynamic resizing | ✅ Automatic, amortized O(1) `Add` | ❌ N/A (manual `realloc`) | ✅ Same — `ArrayList<T>` |
| Type safety | ⭐ Generic, compile-time checked | ❌ N/A | ✅ Same — Java generics (type-erased at runtime) |
| Underlying storage | Contiguous array, doubles on growth | N/A | ⚠ Similar — `ArrayList` also array-backed, doubles on growth |
| Sorting | `List<T>.Sort()`, in-place | `qsort()` | `Collections.sort()` |
| LINQ integration | ⭐ C# only — `Where`, `Select`, etc. directly usable | ❌ N/A | ❌ Not available (Java Streams are the closest analog, different API) |
| Value type elements | ⭐ No boxing for `List<int>` — true generic specialization | N/A | ❌ Different — `ArrayList<Integer>` boxes every element |

---

## Common Patterns

- Prefer `List<T>` over arrays whenever the number of elements can change.
- Pre-size with a known capacity (`new List<T>(capacity)`) when the approximate final size is known, to avoid repeated internal array reallocation.
- Use LINQ (`Where`, `Select`, `OrderBy`) for transformations instead of manual loops when readability matters more than micro-optimized performance.

---

## Common Mistakes

### Coming from C

Manually tracking a size/capacity pair and calling `realloc`-equivalent logic. `List<T>` handles all of this internally — `Add` is amortized O(1) and capacity management is automatic.

### Coming from Java

Assuming `List<int>` boxes each element the way Java's `ArrayList<Integer>` does. Because C# generics are reified (not type-erased), `List<int>` stores actual `int` values inline in its internal array — no boxing, no per-element heap allocation.

---

## Performance Notes

- `Add` is amortized O(1); occasional O(n) reallocation occurs when capacity is exceeded — pre-sizing avoids this cost for known workloads.
- `Insert`/`RemoveAt` at the beginning or middle are O(n) due to shifting elements — use `LinkedList<T>` or a `Queue<T>`/`Stack<T>` if frequent insertion/removal at non-tail positions is required.
- `List<T>.Contains`/`IndexOf` are O(n) linear scans — use `HashSet<T>`/`Dictionary<TKey,TValue>` for frequent membership checks.

---

## Related Features

See also:
- Arrays
- Generics
- Dictionary<TKey,TValue>
- Iterators

---

## Best Practices

- Use `IReadOnlyList<T>`/`IEnumerable<T>` in method signatures that only need to read, reserving `List<T>` for places that need mutation.
- Pre-size lists when the final count is known or estimable.
- Reach for `HashSet<T>`/`Dictionary<TKey,TValue>` instead of `List<T>.Contains` for frequent lookups.

---

## Common APIs

- `List<T>`
- `IEnumerable<T>`, `IList<T>`, `ICollection<T>`
- `System.Linq.Enumerable` (`ToList`, `Where`, `Select`, etc.)

---

## Notes

`List<T>.Capacity` and `List<T>.Count` are different: `Count` is the number of elements actually stored; `Capacity` is the size of the internal backing array, which may be larger than `Count`.

---

## Official Documentation

- [List&lt;T&gt; class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1)
- [Collections overview](https://learn.microsoft.com/en-us/dotnet/standard/collections/)
- [Collection expressions](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-12#collection-expressions)
