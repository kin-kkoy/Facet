# Records

Reference and value records: value equality, immutability, and `with`-expressions.

---

## Quick Summary

`record` (C# 9+) generates value-based `Equals`/`GetHashCode`/`ToString`, plus a `with`-expression for non-destructive mutation — all automatically. `record class` is a reference type (default); `record struct` (C# 10+) is a value type. Records are the idiomatic choice for data-carrying, comparison-by-value types, something Java only partially covers with its more limited `record` (Java 16+, no `with`-expression, no inheritance).

---

## Syntax

```csharp
public record Point(int X, int Y);

// Equivalent, more verbose form
public record Point2
{
    public int X { get; init; }
    public int Y { get; init; }
}
```

---

## Syntax Variations

```csharp
// record struct — value-type record (C# 10+)
public record struct Coordinates(double Lat, double Lng);

// readonly record struct — immutable value-type record
public readonly record struct Money(decimal Amount, string Currency);

// record with additional members beyond the primary constructor
public record Person(string Name, int Age)
{
    public bool IsAdult => Age >= 18; // extra computed member
}

// record inheritance (record class only)
public record Employee(string Name, int Age, string Department) : Person(Name, Age);
```

---

## Examples

```csharp
// Value-based equality out of the box
public record Point(int X, int Y);

var p1 = new Point(1, 2);
var p2 = new Point(1, 2);
Console.WriteLine(p1 == p2);       // true — value equality
Console.WriteLine(p1.Equals(p2));  // true
```

```csharp
// with-expression for non-destructive updates
public record Person(string Name, int Age);

var alice = new Person("Alice", 30);
var olderAlice = alice with { Age = 31 }; // new instance, only Age changed
Console.WriteLine(alice.Age);      // 30 — original unchanged
Console.WriteLine(olderAlice.Age); // 31
```

```csharp
// Auto-generated ToString is useful for logging/debugging out of the box
Console.WriteLine(alice); // Person { Name = Alice, Age = 30 }
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Value-based equality | ⭐ Auto-generated | ❌ N/A (manual `memcmp` for structs) | ⚠ Similar — Java 16+ `record` auto-generates `equals`/`hashCode` |
| `with`-expression | ⭐ C# only | ❌ N/A | ❌ Not available |
| Record inheritance | ⭐ `record class` only | ❌ N/A | ❌ Not available — Java records are implicitly `final` |
| Value-type records | ⭐ `record struct` (C# 10+) | ⚠ Similar — plain `struct` | ❌ Not available |
| Auto `ToString` | ⭐ Formatted, readable default | ❌ N/A | ⚠ Similar — Java records auto-generate `toString` |
| Positional syntax | ⭐ `record Point(int X, int Y)` | ❌ N/A | ⚠ Similar — Java record component syntax is comparable |

---

## Common Patterns

- Use `record` for DTOs, API request/response models, and any data that's compared by value rather than identity.
- Use `record struct` for small, frequently-allocated value-like data (coordinates, money) to avoid heap allocation while still getting value equality and `with`.
- Combine records with pattern matching (`switch` on record shape/properties) for concise, declarative branching logic.

---

## Common Mistakes

### Coming from C

Treating a `record class` like a `struct` (expecting copy-on-assignment). A `record class` is still a reference type by default — only `record struct` copies on assignment. `with` creates a new instance explicitly; plain assignment does not.

### Coming from Java

Assuming C# records are a one-to-one match with Java 16+ records. Java records are always implicitly `final` (no inheritance) and have no `with`-style non-destructive update syntax — C#'s `record class` supports inheritance and `with`, making it considerably more flexible (and requiring more care around equality semantics in a hierarchy).

---

## Performance Notes

- `record class` still heap-allocates like any reference type; `record struct` avoids this but copies on assignment/pass — choose based on size and mutation frequency, same trade-offs as regular `struct` vs `class`.
- Auto-generated equality performs a field-by-field comparison — can be more expensive than reference equality for large records; avoid using large records as dictionary keys in extremely hot paths without profiling.

---

## Related Features

See also:
- Classes
- Structs
- Equality
- Pattern Matching

---

## Best Practices

- Default to `record` for immutable data models; reserve `class` for types with identity and behavior-centric design.
- Use positional syntax (`record Point(int X, int Y)`) for simple records; expand to a body only when extra computed members are needed.
- Mark `record struct` as `readonly` when full immutability is intended, to get compiler-enforced guarantees and better performance characteristics.

---

## Common APIs

- N/A (language-level feature, interacts with `System.Text.Json` for serialization)

---

## Notes

Record equality is based on all public properties (and any manually added fields participating in equality) — inherited records include base-record properties in the equality comparison as well.

---

## Official Documentation

- [Records](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/records)
- [with expression](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/with-expression)
- [record struct](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/struct#record-structs)
