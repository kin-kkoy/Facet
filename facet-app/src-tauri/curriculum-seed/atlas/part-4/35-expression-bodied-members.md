# Expression-bodied Members

Concise single-expression syntax for members whose body is a single expression.

---

## Quick Summary

Expression-bodied members let you replace a full `{ }` block with `=> expression` when a member's implementation is a single expression. Originally limited to methods and read-only properties (C# 6), the syntax expanded to constructors, finalizers, and full property accessors (get/set) in C# 7. It is purely syntactic sugar — it compiles to the same IL as an equivalent block body.

---

## Syntax

```csharp
class Circle
{
    public double Radius { get; set; }

    // Expression-bodied method
    public double Area() => Math.PI * Radius * Radius;

    // Expression-bodied read-only property
    public double Diameter => Radius * 2;

    // Expression-bodied constructor
    public Circle(double radius) => Radius = radius;

    // Expression-bodied finalizer
    ~Circle() => Console.WriteLine("Finalized");

    // Expression-bodied property with get/set
    private double _radius;
    public double RadiusField
    {
        get => _radius;
        set => _radius = value;
    }
}
```

---

## Syntax Variations

```csharp
// Expression-bodied indexer
public class Matrix
{
    private readonly double[,] _data = new double[10, 10];
    public double this[int row, int col]
    {
        get => _data[row, col];
        set => _data[row, col] = value;
    }
}

// Expression-bodied local function
int Square(int x) => x * x;

// Expression-bodied static method
static int Add(int a, int b) => a + b;
```

---

## Examples

```csharp
public class Temperature
{
    public double Celsius { get; init; }

    public double Fahrenheit => Celsius * 9 / 5 + 32;

    public override string ToString() => $"{Celsius}°C";
}
```

```csharp
public class Logger
{
    public void Log(string message) => Console.WriteLine($"[LOG] {message}");
}
```

```csharp
// Realistic usage: expression-bodied members throughout a small value type
public readonly struct Money
{
    public decimal Amount { get; }
    public string Currency { get; }

    public Money(decimal amount, string currency) =>
        (Amount, Currency) = (amount, currency);

    public Money Add(Money other) =>
        Currency == other.Currency
            ? new Money(Amount + other.Amount, Currency)
            : throw new InvalidOperationException("Currency mismatch");

    public override string ToString() => $"{Amount:C} {Currency}";
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Single-expression method body | ⭐ `=>` syntax for methods, properties, constructors, indexers | ❌ N/A (all functions require `{ }`) | ❌ N/A — Java requires block bodies (lambdas aside) |
| Compiled result | ✅ Identical IL to block-bodied equivalent | ❌ N/A | ❌ N/A |
| Applicability | ⭐ Methods, properties, indexers, constructors, finalizers, operators | ❌ N/A | ⚠ Only lambda expressions have expression-bodied form |

---

## Common Patterns

```csharp
// Computed read-only properties
public string FullName => $"{FirstName} {LastName}";

// Simple delegation/forwarding
public override string ToString() => base.ToString();

// Guard-clause throw expressions
public string Name
{
    get => _name;
    set => _name = value ?? throw new ArgumentNullException(nameof(value));
}
```

---

## Common Mistakes

### Coming from C

Trying to fit multi-statement logic into a single `=>` expression using the comma operator or nested ternaries, which C# doesn't support the same way C does.

```csharp
// Doesn't compile — no comma operator in C# for statements
public void Bad() => (DoA(), DoB());
```

Correct approach: use a block body once more than one logical statement is needed, or use tuple/discard expressions only for actual expression composition, not sequencing.

```csharp
public void Good()
{
    DoA();
    DoB();
}
```

### Coming from Java

Assuming expression-bodied syntax is exclusive to lambdas, and not realizing it applies to regular methods and properties too, leading to unnecessarily verbose block bodies for simple getters.

```csharp
// Unnecessarily verbose for a simple computed property
public double Area
{
    get
    {
        return Width * Height;
    }
}
```

Correct approach:

```csharp
public double Area => Width * Height;
```

---

## Performance Notes

No performance difference from block-bodied members — expression-bodied syntax is purely compile-time sugar, producing identical IL.

---

## Related Features

See also:

* Properties
* Methods
* Lambdas

---

## Best Practices

* Use expression-bodied syntax for simple, single-expression computed properties and pass-through methods.
* Avoid forcing complex logic into an expression body just to save lines — prefer readability.
* Use throw expressions (`value ?? throw new ...`) inside expression-bodied setters for concise validation.

---

## Common APIs

Object.ToString

IEquatable\<T\>

ArgumentNullException

---

## Notes

Expression-bodied members were introduced incrementally: methods/read-only properties in C# 6; constructors, finalizers, and get/set accessors in C# 7.

---

## Official Documentation

* [Expression-bodied members](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/statements-expressions-operators/expression-bodied-members)
