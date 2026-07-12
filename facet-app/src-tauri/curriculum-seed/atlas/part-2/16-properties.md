# Properties

Auto-properties, computed properties, and accessor visibility.

---

## Quick Summary

Properties are C#'s first-class syntax for encapsulated field access — they look like fields at the call site but compile to `get_X`/`set_X` methods, giving you validation, computation, or lazy evaluation without changing calling code. This is a language-level feature with no direct equivalent in Java (which relies on manual getter/setter method conventions) or C (which has no member functions at all).

---

## Syntax

```csharp
public class Person
{
    public string Name { get; set; }             // auto-property
    public string Email { get; }                  // get-only auto-property
    public int Age { get; init; }                 // init-only (settable only at construction)

    private int _score;
    public int Score                               // full property with backing field
    {
        get => _score;
        set => _score = value < 0 ? 0 : value;
    }
}
```

---

## Syntax Variations

```csharp
// Expression-bodied property (computed, no backing field)
public class Circle
{
    public double Radius { get; set; }
    public double Area => Math.PI * Radius * Radius;
}

// Asymmetric accessor visibility
public class Account
{
    public decimal Balance { get; private set; } // publicly readable, privately writable
    public void Deposit(decimal amount) => Balance += amount;
}

// Required properties (C# 11+) — must be set at construction/initializer
public class Config
{
    public required string ConnectionString { get; init; }
}
var c = new Config { ConnectionString = "..." }; // required, or compile error

// Static properties
public class Settings
{
    public static string Version { get; } = "1.0.0";
}
```

---

## Examples

```csharp
// Auto-property with a default value
public class Product
{
    public decimal Price { get; set; } = 0m;
}
```

```csharp
// init-only properties enable immutable objects with object-initializer syntax
public class Coordinates
{
    public double Latitude { get; init; }
    public double Longitude { get; init; }
}

var loc = new Coordinates { Latitude = 51.5, Longitude = -0.1 };
// loc.Latitude = 10; // compile error — init-only after construction
```

```csharp
// Validating setter using a backing field
public class Temperature
{
    private double _celsius;
    public double Celsius
    {
        get => _celsius;
        set => _celsius = value < -273.15
            ? throw new ArgumentOutOfRangeException(nameof(value), "Below absolute zero")
            : value;
    }
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Property syntax | ⭐ First-class language feature | ❌ N/A (plain struct fields only) | ❌ Not available — manual `getX()`/`setX()` methods by convention |
| Auto-properties | ⭐ Compiler-generated backing field | ❌ N/A | ❌ Not available |
| Call-site syntax | Field-like: `obj.Prop` | `obj.field` | Method-call: `obj.getProp()` |
| Asymmetric access | ⭐ `{ get; private set; }` | N/A | ⚠ Similar — separate getter/setter method visibility |
| Computed properties | ⭐ Expression-bodied `=>` | N/A | ⚠ Similar — a plain method, just not property syntax |
| Immutability helper | ⭐ `init` accessor, `required` modifier | N/A | ❌ Not available (final fields + constructor only) |

---

## Common Patterns

- Use auto-properties (`{ get; set; }`) by default; drop to a full property with a backing field only when validation/computation is needed.
- Use `{ get; init; }` for immutable data models constructed via object initializers.
- Use `{ get; private set; }` for state that's publicly readable but should only change through class-controlled methods.

---

## Common Mistakes

### Coming from C

Manually writing `GetX()`/`SetX()` methods out of habit. C# properties replace this pattern entirely — using property syntax is idiomatic and expected in public APIs.

### Coming from Java

Writing explicit `GetName()`/`SetName(string)` methods instead of a `Name` property. This works but is non-idiomatic in C# — libraries, data-binding (WPF/Blazor), and serializers (`System.Text.Json`) all expect property syntax, not getter/setter method pairs.

```csharp
// Non-idiomatic (Java style, ported directly)
private string name;
public string GetName() => name;
public void SetName(string value) => name = value;

// Idiomatic C#
public string Name { get; set; }
```

---

## Performance Notes

- Auto-properties compile to a private backing field plus simple `get`/`set` methods — the JIT typically inlines these, so there is effectively zero overhead versus a raw field in release builds.
- Computed (expression-bodied) properties re-run their expression on every access — cache the result manually if the computation is expensive and called frequently.

---

## Related Features

See also:
- Classes
- Encapsulation
- Records

---

## Best Practices

- Default to `init` for properties that shouldn't change after construction; use `required` to force callers to set them.
- Avoid side effects (I/O, mutation of unrelated state) inside property getters — callers expect getters to be cheap and pure.
- Prefer computed properties over duplicated manual calculations scattered across the codebase.

---

## Common APIs

- N/A (language-level feature; interacts heavily with `System.Text.Json`, data-binding frameworks)

---

## Notes

`required` (C# 11+) combined with `init` gives compile-time-enforced mandatory initialization without needing a constructor overload for every combination of required fields.

---

## Official Documentation

- [Properties](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/properties)
- [init keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/init)
- [required modifier](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/required)
