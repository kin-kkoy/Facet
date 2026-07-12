# Structs

Value-type structs: semantics, ref structs, and readonly structs.

---

## Quick Summary

A `struct` is a user-defined value type — copied on assignment, passed by value by default, and typically stack-allocated when used as a local variable (though it can live on the heap when boxed or embedded in a class/array). C# structs can implement interfaces and have methods/properties/constructors, unlike C structs (plain data only) and unlike Java, which has no user-definable value types at all.

---

## Syntax

```csharp
public struct Point
{
    public int X, Y;

    public Point(int x, int y)
    {
        X = x;
        Y = y;
    }
}
```

---

## Syntax Variations

```csharp
// readonly struct — all fields immutable after construction
public readonly struct Money
{
    public decimal Amount { get; }
    public string Currency { get; }
    public Money(decimal amount, string currency) => (Amount, Currency) = (amount, currency);
}

// ref struct — stack-only, cannot be boxed, cannot be a class field, cannot be captured in lambdas
public ref struct SpanWrapper
{
    public Span<byte> Data;
}

// struct implementing an interface
public struct Vector2 : IEquatable<Vector2>
{
    public double X, Y;
    public bool Equals(Vector2 other) => X == other.X && Y == other.Y;
}

// Parameterless struct constructors (C# 10+)
public struct Counter
{
    public int Value;
    public Counter() => Value = 1; // previously not allowed for structs
}
```

---

## Examples

```csharp
// Value semantics: assignment copies the entire struct
struct Point { public int X, Y; }

Point a = new Point { X = 1, Y = 2 };
Point b = a;      // full copy
b.X = 100;
Console.WriteLine(a.X); // 1 — unaffected by change to b
```

```csharp
// Structs in arrays are stored inline (contiguous memory), improving cache locality
Point[] points = new Point[1000]; // one contiguous block, not 1000 separate heap objects
```

```csharp
// ref struct example: Span<T> avoids allocations for slicing
Span<int> span = stackalloc int[] { 1, 2, 3, 4, 5 };
Span<int> slice = span.Slice(1, 3); // no heap allocation
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| User-defined value types | ⭐ `struct` | ✅ Same concept | ❌ Not available (all objects are reference types; primitives are built-in only) |
| Copy semantics | ✅ Full copy on assignment | ✅ Same | N/A — no equivalent |
| Methods/interfaces on value types | ⭐ C# only | ❌ N/A (plain data only) | ❌ N/A |
| Default field values | ✅ Zero-initialized | ✅ Same for static storage; garbage for automatic storage | N/A |
| `ref struct` (stack-only) | ⭐ C# only | ⚠ Similar — everything on the stack unless explicitly heap-allocated | ❌ N/A |
| Parameterless constructors | ⭐ C# 10+, opt-in | ❌ N/A | N/A |

---

## Common Patterns

- Use structs for small, immutable, value-like data (coordinates, RGB colors, money amounts, IDs wrapping a primitive).
- Use `readonly struct` whenever the struct is meant to be immutable — enables compiler optimizations and prevents accidental defensive-copy bugs.
- Use `ref struct` (like `Span<T>`) for high-performance, allocation-free APIs that must never escape to the heap.

---

## Common Mistakes

### Coming from C

Assuming a struct always lives on the stack. In C#, a struct is stack-allocated only as a local variable or parameter; it's heap-allocated when it's a field of a class, an array element, or boxed to `object`/an interface type.

### Coming from Java

Not realizing structs exist at all and defaulting to `class` for every small data type, incurring unnecessary heap allocation and GC pressure for high-frequency, short-lived values (e.g., a `Point` created millions of times in a hot loop).

```csharp
// Unnecessary heap allocation per instance (Java-habit translation)
class Point { public int X, Y; }

// Idiomatic C# — no heap allocation for locals/array elements
struct Point { public int X, Y; }
```

---

## Performance Notes

- Small structs (a few machine words) passed by value are typically faster than heap-allocated classes due to no GC pressure and better cache locality.
- Large structs copied frequently can become *slower* than a class — pass with `in`/`ref` to avoid copying, or switch to `class` once the struct exceeds roughly 16–24 bytes and is copied often.
- Boxing a struct (assigning to `object`, or a non-generic collection) allocates on the heap and negates the performance benefit — avoid in hot paths.

---

## Related Features

See also:
- Types
- Records
- Parameters
- Equality

---

## Best Practices

- Keep structs small (a general rule of thumb: ≤ 16 bytes) and immutable.
- Override `Equals`/`GetHashCode` (or implement `IEquatable<T>`) on structs used in collections/comparisons to avoid slow reflection-based default equality.
- Use `record struct` instead of a manually written `struct` when you want auto-generated equality and `with`-expressions.

---

## Common APIs

- `System.ValueType` (implicit base of all structs)
- `Span<T>`, `ReadOnlySpan<T>` (notable `ref struct` types)

---

## Notes

Every `struct` implicitly derives from `System.ValueType`, which itself derives from `object` — this is how boxing works, even though structs aren't normally reference types.

---

## Official Documentation

- [Structure types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/struct)
- [ref struct](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/ref-struct)
- [Write safe and efficient C# code](https://learn.microsoft.com/en-us/dotnet/csharp/write-safe-efficient-code)
