# Equality

Reference vs value equality, `Equals`, `==`, `GetHashCode`, and `IEquatable<T>`.

---

## Quick Summary

C# equality is layered: `object.Equals` (virtual, overridable), the `==` operator (overloadable separately from `Equals`), `IEquatable<T>` (typed, allocation-free equality), and `GetHashCode` (required to stay consistent with `Equals` for correct hashing). Records auto-generate all of this; ordinary classes default to reference equality; structs default to slow, reflection-based field-by-field equality unless overridden.

---

## Syntax

```csharp
public class Point : IEquatable<Point>
{
    public int X, Y;

    public bool Equals(Point? other) =>
        other is not null && X == other.X && Y == other.Y;

    public override bool Equals(object? obj) => Equals(obj as Point);

    public override int GetHashCode() => HashCode.Combine(X, Y);
}
```

---

## Syntax Variations

```csharp
// Overloading == and != alongside Equals (recommended to keep them consistent)
public class Point : IEquatable<Point>
{
    public int X, Y;
    public bool Equals(Point? other) => other is not null && X == other.X && Y == other.Y;
    public override bool Equals(object? obj) => Equals(obj as Point);
    public override int GetHashCode() => HashCode.Combine(X, Y);

    public static bool operator ==(Point? a, Point? b) =>
        a is null ? b is null : a.Equals(b);
    public static bool operator !=(Point? a, Point? b) => !(a == b);
}

// record — all of the above generated automatically
public record PointRecord(int X, int Y);

// ReferenceEquals — always checks identity, ignores overrides
bool sameInstance = ReferenceEquals(obj1, obj2);
```

---

## Examples

```csharp
// Default class equality is reference-based
class Point { public int X, Y; }
var p1 = new Point { X = 1, Y = 2 };
var p2 = new Point { X = 1, Y = 2 };
Console.WriteLine(p1 == p2);      // false — different objects
Console.WriteLine(p1.Equals(p2)); // false — same, unless overridden
```

```csharp
// Records provide value equality with zero manual code
record PointRecord(int X, int Y);
var r1 = new PointRecord(1, 2);
var r2 = new PointRecord(1, 2);
Console.WriteLine(r1 == r2);      // true
Console.WriteLine(r1.Equals(r2)); // true
```

```csharp
// HashCode.Combine simplifies correct GetHashCode implementations
public override int GetHashCode() => HashCode.Combine(X, Y, Z);
// vs. manual (error-prone) bit-shifting approaches from older C#/Java code
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Default equality (class/reference type) | Reference equality | N/A (no objects) | ✅ Same — reference equality by default |
| Overloadable `==` | ⭐ C# only — separate from `Equals` override | ❌ N/A | ❌ Not available (`==` is always reference equality for objects) |
| Typed equality interface | `IEquatable<T>` — avoids boxing/casting | ❌ N/A | ⚠ Similar — no direct equivalent; `equals(Object)` always takes `Object` |
| Auto-generated value equality | ⭐ `record`/`record struct` | ❌ N/A | ⚠ Similar — Java 16+ `record` auto-generates `equals`/`hashCode` |
| `GetHashCode`/`hashCode` contract | Must be consistent with `Equals` | N/A | ✅ Same contract — `hashCode` must be consistent with `equals` |
| Struct default equality | ⚠ Similar — reflection-based field comparison (slow) unless overridden | ⚠ Similar — `memcmp`-style comparison possible manually | N/A — no user-defined value types |

---

## Common Patterns

- Use `record`/`record struct` whenever value-based equality is the primary requirement — avoids manually implementing `Equals`/`GetHashCode`/`==`/`!=` correctly.
- Implement `IEquatable<T>` on custom structs used in collections to avoid the default slow, reflection-based struct equality.
- Use `HashCode.Combine(...)` for concise, well-distributed hash code implementations.

---

## Common Mistakes

### Coming from C

Not applicable directly (C has no object equality concept), but developers sometimes default to `memcmp`-style manual byte comparison instead of using C#'s built-in equality mechanisms.

### Coming from Java

Overriding only `Equals` (`equals` in Java) and forgetting `GetHashCode` (`hashCode`). Unlike some Java IDEs that auto-generate both together, C# requires manually keeping them in sync — mismatched implementations silently break `Dictionary<TKey,TValue>`/`HashSet<T>` behavior (see Dictionary, HashSet).

```csharp
// Bug: Equals overridden without GetHashCode — breaks hash-based collections
public override bool Equals(object? obj) => obj is Point p && X == p.X && Y == p.Y;
// Missing: public override int GetHashCode() => HashCode.Combine(X, Y);
```

---

## Performance Notes

- Default struct equality (no override) uses reflection and is significantly slower than a hand-written or `record struct`-generated comparison — always override for structs used in hot paths or as dictionary keys.
- `IEquatable<T>.Equals(T)` avoids boxing and type-checking overhead compared to `object.Equals(object)` — implement it explicitly for value types used in generic collections.

---

## Related Features

See also:
- Records
- Structs
- Dictionary<TKey,TValue>
- HashSet<T>

---

## Best Practices

- Always override `GetHashCode` alongside `Equals`.
- Implement `IEquatable<T>` for any type frequently compared in generic/collection contexts.
- Prefer `record`/`record struct` over manual equality implementations unless there's a specific reason not to (e.g., needing reference semantics with a `class`).

---

## Common APIs

- `object.Equals`, `object.GetHashCode`, `object.ReferenceEquals`
- `IEquatable<T>`
- `HashCode.Combine`
- `EqualityComparer<T>.Default`

---

## Notes

`EqualityComparer<T>.Default` is what generic collections (`Dictionary<TKey,TValue>`, `HashSet<T>`) use internally to compare elements — it automatically prefers `IEquatable<T>.Equals` over `object.Equals` when available, avoiding boxing for value types.

---

## Official Documentation

- [Equality comparisons](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/statements-expressions-operators/equality-comparisons)
- [IEquatable&lt;T&gt; interface](https://learn.microsoft.com/en-us/dotnet/api/system.iequatable-1)
- [HashCode.Combine method](https://learn.microsoft.com/en-us/dotnet/api/system.hashcode.combine)
