# HashSet&lt;T&gt;

The generic unordered collection of unique elements.

---

## Quick Summary

`HashSet<T>` stores unique elements with average O(1) add, remove, and membership-check operations, backed by the same hash-table structure as `Dictionary<TKey,TValue>`. It's the analog of Java's `HashSet<T>`. C# additionally provides rich, allocation-conscious set-algebra methods (`UnionWith`, `IntersectWith`, `ExceptWith`) that mutate in place.

---

## Syntax

```csharp
HashSet<int> unique = new HashSet<int>();
unique.Add(1);
unique.Add(2);
unique.Add(1); // no-op, already present

HashSet<int> initialized = new HashSet<int> { 1, 2, 3 };
```

---

## Syntax Variations

```csharp
// Collection expression (C# 12+)
HashSet<int> nums = [1, 2, 3];

// Creating from another sequence, deduplicating automatically
var deduped = new HashSet<int>(new[] { 1, 2, 2, 3, 3, 3 }); // { 1, 2, 3 }

// With a custom equality comparer
var caseInsensitive = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
caseInsensitive.Add("Hello");
caseInsensitive.Add("HELLO"); // no-op — considered a duplicate
```

---

## Examples

```csharp
// Set algebra — mutates the calling set in place
var a = new HashSet<int> { 1, 2, 3 };
var b = new HashSet<int> { 2, 3, 4 };

var union = new HashSet<int>(a);
union.UnionWith(b);        // { 1, 2, 3, 4 }

var intersection = new HashSet<int>(a);
intersection.IntersectWith(b); // { 2, 3 }

var difference = new HashSet<int>(a);
difference.ExceptWith(b);      // { 1 }
```

```csharp
// Fast membership checking, O(1) average
var seen = new HashSet<int>();
foreach (var n in new[] { 1, 2, 2, 3 })
{
    if (!seen.Add(n)) // Add returns false if already present
        Console.WriteLine($"Duplicate: {n}");
}
```

```csharp
// Subset/superset/overlap checks
bool isSubset = a.IsSubsetOf(b);
bool overlaps = a.Overlaps(b);
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Underlying structure | Hash table (same family as `Dictionary<TKey,TValue>`) | ❌ N/A (manual implementation) | ⚠ Similar — `HashSet<T>`, same concept |
| Average complexity | O(1) add/remove/contains | N/A | ✅ Same — O(1) |
| Set-algebra methods | ⭐ `UnionWith`, `IntersectWith`, `ExceptWith`, `SymmetricExceptWith` — in-place | ❌ N/A | ❌ Different — Java uses `addAll`/`retainAll`/`removeAll`, less explicit naming |
| Ordering guarantee | ❌ Not guaranteed | N/A | ❌ Not guaranteed (`LinkedHashSet` for order in Java) |
| Custom equality | `IEqualityComparer<T>` constructor overload | N/A | ⚠ Similar — override `equals`/`hashCode` on element type |

---

## Common Patterns

- Use `HashSet<T>` for deduplication and fast membership testing — significantly faster than scanning a `List<T>` with `Contains`.
- Use the `Add` method's `bool` return value to detect duplicates during a single pass, without a separate `Contains` check.
- Use `UnionWith`/`IntersectWith`/`ExceptWith` for readable, allocation-light set algebra instead of manual LINQ-based set operations when mutating in place is acceptable.

---

## Common Mistakes

### Coming from C

Manually deduplicating with a sorted array and linear scan (or a hand-rolled hash table) when `HashSet<T>` already provides an optimized, general-purpose implementation.

### Coming from Java

Using `list.Contains()` habitually for membership checks (a common Java/general pattern for smaller lists) instead of switching to `HashSet<T>` once the collection grows — `List<T>.Contains` is O(n) while `HashSet<T>.Contains` is O(1) average.

---

## Performance Notes

- Average O(1) for `Add`/`Remove`/`Contains`; degrades toward O(n) only with pathological hash collisions.
- `UnionWith`/`IntersectWith`/etc. mutate the target set in place and avoid the extra allocations that equivalent LINQ (`.Union().ToHashSet()`) chains would incur.
- Pre-sizing (`new HashSet<T>(capacity)`) avoids rehashing during bulk population.

---

## Related Features

See also:
- Dictionary<TKey,TValue>
- List<T>
- Equality
- Generics

---

## Best Practices

- Reach for `HashSet<T>` as soon as membership checks or deduplication become a bottleneck with `List<T>`.
- Provide a custom `IEqualityComparer<T>` rather than overriding `Equals`/`GetHashCode` on a type when the comparison logic is context-specific (e.g., case-insensitive strings only in one use case).
- Use `IsSubsetOf`/`IsSupersetOf`/`Overlaps` for expressive set-relationship checks instead of manual loops.

---

## Common APIs

- `HashSet<T>`
- `ISet<T>`, `IReadOnlySet<T>`
- `IEqualityComparer<T>`

---

## Notes

`HashSet<T>` and `Dictionary<TKey,TValue>` share the same underlying bucket/hash implementation internally — a `HashSet<T>` is conceptually similar to a `Dictionary<T, object>` with values discarded.

---

## Official Documentation

- [HashSet&lt;T&gt; class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.hashset-1)
- [Set operations (LINQ)](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/linq/set-operations)
