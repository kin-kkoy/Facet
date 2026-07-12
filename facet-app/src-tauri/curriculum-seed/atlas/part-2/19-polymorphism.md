# Polymorphism

Runtime (virtual dispatch) and compile-time (overloading) polymorphism.

---

## Quick Summary

C# supports both compile-time polymorphism (method overloading, operator overloading) and runtime polymorphism (virtual/abstract methods, interface dispatch). Pattern matching (`switch` expressions, type patterns) provides an additional, C#-flavored form of polymorphic-style branching without requiring inheritance at all.

---

## Syntax

```csharp
// Runtime polymorphism via virtual/override
public abstract class Shape { public abstract double Area(); }
public class Circle : Shape { public double R; public override double Area() => Math.PI * R * R; }
public class Square : Shape { public double S; public override double Area() => S * S; }

Shape[] shapes = { new Circle { R = 2 }, new Square { S = 3 } };
foreach (var s in shapes)
    Console.WriteLine(s.Area()); // calls the correct override at runtime
```

---

## Syntax Variations

```csharp
// Interface-based polymorphism
public interface IShape { double Area(); }
public class Triangle : IShape
{
    public double Base, Height;
    public double Area() => 0.5 * Base * Height;
}

IShape shape = new Triangle { Base = 4, Height = 3 };
Console.WriteLine(shape.Area());

// Pattern-matching-based polymorphism (no inheritance needed)
double AreaOf(object shape) => shape switch
{
    Circle c => Math.PI * c.R * c.R,
    Square s => s.S * s.S,
    _ => throw new ArgumentException("Unknown shape")
};

// Compile-time polymorphism via overloading
void Print(int x) => Console.WriteLine($"int: {x}");
void Print(string x) => Console.WriteLine($"string: {x}");
```

---

## Examples

```csharp
// Covariant return types (C# 9+) — override can return a more derived type
public class Animal { public virtual Animal Clone() => new Animal(); }
public class Dog : Animal { public override Dog Clone() => new Dog(); } // covariant
```

```csharp
// Polymorphism through generics + constraints, avoiding boxing/virtual dispatch entirely
double SumAreas<T>(IEnumerable<T> shapes) where T : IShape
    => shapes.Sum(s => s.Area());
```

```csharp
// is/as pattern for selective polymorphic behavior
void Handle(object item)
{
    if (item is IDisposable disposable)
    {
        disposable.Dispose();
    }
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Method overloading | ✅ Same | ❌ Not available (name mangling workarounds) | ✅ Same |
| Virtual/override dispatch | ✅ Same concept | ❌ N/A (function pointers simulate it) | ✅ Same concept, but implicit by default |
| Interface-based dispatch | ✅ Same | ❌ N/A | ✅ Same |
| Covariant return types | ⭐ C# 9+ | ❌ N/A | ⚠ Similar — Java has always supported covariant returns |
| Pattern-matching polymorphism | ⭐ C# only — `switch` on type/shape without inheritance | ❌ N/A | ⚠ Similar — Java 21+ record patterns, less mature |
| Operator overloading as polymorphism | ⭐ C# only | ❌ N/A | ❌ Not available |

---

## Common Patterns

- Prefer interface-based polymorphism over class inheritance when types don't share meaningful implementation, only contract.
- Use pattern-matching `switch` expressions as a lightweight alternative to the classic Visitor pattern when the type set is closed and known.
- Use generic constraints (`where T : IShape`) to get polymorphic behavior without virtual-dispatch overhead when the concrete type is known at compile time.

---

## Common Mistakes

### Coming from C

Reimplementing polymorphism manually with function pointers/tagged unions (`struct { int tag; void* data; }`) when C#'s virtual dispatch or pattern matching already solves this directly and safely.

### Coming from Java

Assuming every method call is virtual, as in Java. In C#, only `virtual`/`abstract`/interface members dispatch polymorphically — a non-virtual method call always resolves to the compile-time (static) type, not the runtime type (see Inheritance for the `new`-hiding pitfall).

---

## Performance Notes

- Virtual/interface dispatch has a small, generally negligible runtime cost (vtable/interface-table lookup) compared to a direct call.
- Generic-constraint-based "polymorphism" (`where T : IShape`) can be devirtualized/specialized by the JIT for value-type `T`, often outperforming interface-typed virtual dispatch in hot paths.

---

## Related Features

See also:
- Inheritance
- Interfaces
- Pattern Matching
- Generics

---

## Best Practices

- Reach for interfaces over base classes when types don't need shared implementation — favors composition and easier testing.
- Use pattern-matching `switch` for closed, well-known type sets; use virtual dispatch for open, extensible hierarchies.
- Document covariant return overrides clearly, since they can be non-obvious when reading only the base class.

---

## Common APIs

- `IComparable<T>`, `IEquatable<T>` (common polymorphic contracts in the BCL)

---

## Notes

C# has no formal "Visitor pattern" language support, but `switch` expressions with type patterns cover most of its use cases with far less boilerplate.

---

## Official Documentation

- [Polymorphism](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/polymorphism)
- [Covariant return types](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-9#covariant-return-types)
- [Pattern matching overview](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/functional/pattern-matching)
