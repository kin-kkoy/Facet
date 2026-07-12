# Pattern Matching

Structural and type-based matching expressions for concise conditional logic.

---

## Quick Summary

Pattern matching lets you test a value against a shape — a type, a constant, a range, a property structure, or a combination — and extract data in the process. C# exposes this through `is` expressions, `switch` statements, and `switch` expressions. It has grown significantly since C# 7 and now covers type patterns, property patterns, positional patterns, relational patterns, and logical pattern combinators.

---

## Syntax

```csharp
// is expression with type pattern
if (obj is string s) { }

// switch statement with patterns
switch (shape)
{
    case Circle c: break;
    case Rectangle r when r.Width == r.Height: break;
    default: break;
}

// switch expression
string Describe(object obj) => obj switch
{
    int i => $"int: {i}",
    string s => $"string: {s}",
    _ => "unknown"
};
```

---

## Syntax Variations

```csharp
// Constant pattern
if (x is 0) { }

// Relational pattern
if (age is >= 18) { }

// Logical patterns: and, or, not
if (x is > 0 and < 100) { }
if (x is not null) { }

// Property pattern
if (person is { Age: >= 18, Name: "Alice" }) { }

// Positional pattern (requires Deconstruct)
if (point is (0, 0)) { }

// Nested property pattern
if (order is { Customer.Address.City: "Seattle" }) { }

// var pattern (always matches, binds a variable)
if (obj is var x) { }

// List pattern (C# 11+)
if (arr is [1, 2, .. ]) { }
```

---

## Examples

```csharp
object value = 42;

if (value is int number)
{
    Console.WriteLine($"It's an int: {number}");
}
```

```csharp
static string Grade(int score) => score switch
{
    >= 90 => "A",
    >= 80 => "B",
    >= 70 => "C",
    _ => "F"
};
```

```csharp
record Point(int X, int Y);

static string Classify(Point p) => p switch
{
    (0, 0) => "Origin",
    (var x, 0) => $"On X axis at {x}",
    (0, var y) => $"On Y axis at {y}",
    _ => "Somewhere else"
};
```

```csharp
// Realistic usage: validating and branching on a DTO
record ShippingInfo(string Country, string? PostalCode, bool IsExpress);

static decimal CalculateFee(ShippingInfo info) => info switch
{
    { Country: "US", IsExpress: true } => 25.00m,
    { Country: "US" } => 10.00m,
    { PostalCode: null } => throw new ArgumentException("Postal code required"),
    _ => 15.00m
};
```

```csharp
// List pattern for array shape matching
static string Summarize(int[] values) => values switch
{
    [] => "empty",
    [var single] => $"single value: {single}",
    [var first, .., var last] => $"from {first} to {last}",
};
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Type-based matching | ⭐ `is`/`switch` type patterns with binding | ❌ No type system for this; manual tag/union checks | ⚠ `switch` pattern matching for types (Java 21+ `instanceof` patterns) |
| Property/deconstruction matching | ⭐ Property and positional patterns | ❌ N/A | ❌ No structural/property patterns |
| Exhaustiveness | ⚠ Compiler warns on non-exhaustive switch expressions | ❌ N/A | ⚠ Java requires exhaustive `sealed` hierarchies for switch expressions |
| Range/relational patterns | ⭐ `>= 18`, `> 0 and < 100` | ❌ Manual `if` chains | ❌ Manual `if` chains |
| List patterns | ⭐ `[1, 2, ..]` (C# 11+) | ❌ N/A | ❌ N/A |

---

## Common Patterns

```csharp
// Null-check idiom
if (input is not null) { }

// Combined type + condition
if (obj is List<int> { Count: > 0 } list) { }

// Discard unused bindings
if (obj is (int, _)) { }
```

---

## Common Mistakes

### Coming from C

Reaching for a `switch` on an `enum`-like tag field with manual casting, instead of switching directly on type or property patterns.

```csharp
// C-style tagged union simulation — unnecessarily verbose
if (shape.Type == ShapeType.Circle)
{
    var c = (Circle)shape;
}
```

Correct approach: use a type pattern switch directly on the polymorphic type, letting the compiler do the cast.

```csharp
if (shape is Circle c) { }
```

### Coming from Java

Writing old-style `instanceof` + explicit cast even in modern C#, missing that the pattern variable is bound automatically.

```csharp
// Unnecessary — Java 8-11 style
if (obj is string)
{
    string s = (string)obj;
}
```

Correct approach:

```csharp
if (obj is string s) { }
```

---

## Performance Notes

Pattern matching on types compiles to efficient `isinst`/`castclass` IL instructions — no reflection involved. Switch expressions over patterns may compile to a decision tree or jump table depending on pattern complexity; the compiler optimizes for the common cases automatically.

---

## Related Features

See also:

* Control Flow
* Records
* Nullable Reference Types

---

## Best Practices

* Prefer switch expressions over switch statements for value-producing logic.
* Use property patterns instead of multiple chained `&&` conditions.
* Add a `_ => throw new ArgumentOutOfRangeException()` (or similar) default arm to force exhaustiveness checks.
* Use `is not null` instead of `!= null` for consistency with pattern-matching style.

---

## Common APIs

Enum

Object

ArgumentOutOfRangeException

Nullable\<T\>

---

## Notes

List patterns (`[first, .., last]`) require the type to have an indexer and a `Length`/`Count` property, or implement `IEnumerable` with appropriate slicing support.

---

## Official Documentation

* [Pattern matching overview](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/functional/pattern-matching)
* [Patterns reference](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns)
