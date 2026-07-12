# Dictionary&lt;TKey,TValue&gt;

The generic hash-table-backed key/value collection.

---

## Quick Summary

`Dictionary<TKey,TValue>` is C#'s hash-table implementation, offering average O(1) lookup, insertion, and removal by key. It's the direct analog of Java's `HashMap<K,V>` and roughly comparable to a hash table built manually in C. Keys must implement `Equals`/`GetHashCode` correctly (either via overrides or `IEquatable<T>`) for the dictionary to function correctly.

---

## Syntax

```csharp
Dictionary<string, int> ages = new Dictionary<string, int>();
ages["Alice"] = 30;
ages["Bob"] = 25;
```

---

## Syntax Variations

```csharp
// Object initializer for dictionaries (index-based)
var ages = new Dictionary<string, int>
{
    ["Alice"] = 30,
    ["Bob"] = 25
};

// Add-based initializer (throws on duplicate keys, unlike index syntax above)
var ages2 = new Dictionary<string, int>
{
    { "Alice", 30 },
    { "Bob", 25 }
};

// Target-typed / inferred
Dictionary<string, int> ages3 = new() { ["Alice"] = 30 };
```

---

## Examples

```csharp
// Safe lookup with TryGetValue avoids exceptions and double lookups
var ages = new Dictionary<string, int> { ["Alice"] = 30 };

if (ages.TryGetValue("Alice", out int age))
    Console.WriteLine(age);
else
    Console.WriteLine("Not found");
```

```csharp
// Iterating key-value pairs
foreach (KeyValuePair<string, int> kvp in ages)
    Console.WriteLine($"{kvp.Key} = {kvp.Value}");

// Deconstructing KeyValuePair directly in foreach (C# 7+)
foreach (var (name, personAge) in ages)
    Console.WriteLine($"{name} = {personAge}");
```

```csharp
// GetValueOrDefault avoids exceptions for missing keys without an out-parameter
int bobAge = ages.GetValueOrDefault("Bob", defaultValue: 0);
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Underlying structure | Hash table (buckets + chaining) | ❌ N/A (manual implementation required) | ⚠ Similar — `HashMap<K,V>`, same conceptual structure |
| Average lookup complexity | O(1) | N/A | ✅ Same — O(1) |
| Missing-key access via `[]` | ❌ Different — throws `KeyNotFoundException` | N/A | ❌ Different — Java's `get()` returns `null`, no exception |
| Safe lookup pattern | ⭐ `TryGetValue(key, out value)` | N/A | ⚠ Similar — `containsKey` + `get`, or `getOrDefault` |
| Insertion order preserved | ❌ Not guaranteed | N/A | ❌ Not guaranteed (use `LinkedHashMap` in Java for that) |
| Key equality customization | `IEqualityComparer<TKey>` | N/A | ⚠ Similar — override `equals`/`hashCode`, or pass a `Comparator` for some APIs |

---

## Common Patterns

- Use `TryGetValue` instead of checking `ContainsKey` followed by indexing — avoids a redundant second lookup.
- Use `GetValueOrDefault` for concise "give me the value or a fallback" reads.
- Supply a custom `IEqualityComparer<TKey>` (e.g., `StringComparer.OrdinalIgnoreCase`) when case-insensitive or custom key comparison is needed.

---

## Common Mistakes

### Coming from C

Attempting to hand-roll a hash table with arrays and manual chaining/probing logic when `Dictionary<TKey,TValue>` already provides a well-tested, tuned implementation.

### Coming from Java

Assuming `dict[missingKey]` returns `null`/`default` like Java's `map.get(missingKey)`. In C#, indexer access on a missing key throws `KeyNotFoundException` — use `TryGetValue` or `ContainsKey` first, or `GetValueOrDefault` for a `null`/default-returning read.

```csharp
// Throws if "Charlie" isn't present
// int age = ages["Charlie"];

// Safe equivalent to Java's map.get()
int age = ages.GetValueOrDefault("Charlie"); // 0 if missing (default(int))
```

---

## Performance Notes

- Average O(1) for `Add`/lookup/`Remove`; worst case O(n) if many keys hash-collide (rare with a good hash function and the built-in string/numeric hashers).
- Pre-sizing (`new Dictionary<TKey,TValue>(capacity)`) avoids repeated internal resizing/rehashing for known workloads.
- Poor `GetHashCode` implementations on custom key types can degrade performance to near-linear — always pair a custom `Equals` override with a matching `GetHashCode` override.

---

## Related Features

See also:
- List<T>
- HashSet<T>
- Equality
- Generics

---

## Best Practices

- Always override `GetHashCode` when overriding `Equals` on a custom key type — mismatched implementations break dictionary correctness silently.
- Use `TryGetValue` over `ContainsKey` + indexer for a single combined, allocation-free lookup.
- Prefer `IReadOnlyDictionary<TKey,TValue>` in method signatures that only need to read.

---

## Common APIs

- `Dictionary<TKey,TValue>`
- `IDictionary<TKey,TValue>`, `IReadOnlyDictionary<TKey,TValue>`
- `KeyValuePair<TKey,TValue>`
- `IEqualityComparer<T>`, `StringComparer`

---

## Notes

`Dictionary<TKey,TValue>` does not guarantee enumeration order — even though insertion order is often observed in practice due to implementation details, it is not a contract and can change between .NET versions; use an ordered structure (e.g., `SortedDictionary<TKey,TValue>` or a `List<KeyValuePair<...>>`) if order matters.

---

## Official Documentation

- [Dictionary&lt;TKey,TValue&gt; class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2)
- [Equality comparisons](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/statements-expressions-operators/equality-comparisons)
