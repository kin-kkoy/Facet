# Classes

Class declaration, members, modifiers, and static/instance semantics.

---

## Quick Summary

A `class` is a reference type combining fields, properties, methods, constructors, and nested types. C# classes support single inheritance, multiple interface implementation, access modifiers per-member, and a rich set of type-level modifiers (`abstract`, `sealed`, `static`, `partial`). Unlike Java, C# has no implicit `public`/`package-private` default — members default to `private`.

---

## Syntax

```csharp
public class Customer
{
    public int Id;
    public string Name;

    public void Greet() => Console.WriteLine($"Hello, {Name}");
}
```

---

## Syntax Variations

```csharp
// Sealed class — cannot be inherited
public sealed class FinalType { }

// Abstract class — cannot be instantiated, may contain abstract members
public abstract class Shape
{
    public abstract double Area();
}

// Static class — cannot be instantiated, all members must be static
public static class MathHelpers
{
    public static int Square(int x) => x * x;
}

// Partial class — split across files
public partial class Widget { }

// Primary constructor (C# 12+)
public class Point(int x, int y)
{
    public int X => x;
    public int Y => y;
}
```

---

## Examples

```csharp
// Default access is private for members, internal for top-level classes
class Account            // internal by default
{
    decimal balance;     // private by default

    public void Deposit(decimal amount) => balance += amount;
}
```

```csharp
// Static members belong to the type, not an instance
public class Counter
{
    public static int InstanceCount = 0;
    public Counter() => InstanceCount++;
}

new Counter();
new Counter();
Console.WriteLine(Counter.InstanceCount); // 2
```

```csharp
// Primary constructor reduces boilerplate for simple data-holding classes
public class Employee(string name, decimal salary)
{
    public string Name { get; } = name;
    public decimal Salary { get; } = salary;
    public decimal AnnualSalary => Salary * 12;
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Default member access | ⭐ `private` | N/A (structs have no access control) | ❌ Different — package-private (no modifier) |
| Default top-level class access | `internal` | N/A | ❌ Different — package-private |
| Multiple inheritance | ❌ Single class inheritance, multiple interfaces | ❌ N/A (no OOP) | ⚠ Similar — single class inheritance, multiple interfaces |
| `static class` | ⭐ C# only — compiler-enforced, cannot instantiate | ❌ N/A | ❌ Not available (utility classes use private constructor convention) |
| `sealed` | ⭐ Prevents inheritance | ❌ N/A | ⚠ Similar — Java's `final` class |
| Primary constructors | ⭐ C# 12+ | ❌ N/A | ❌ Not available (records come closest) |

---

## Common Patterns

- Use `sealed` on classes not designed for inheritance — improves performance (devirtualization) and communicates intent.
- Use `static class` for stateless utility/helper collections (`Math`-style APIs).
- Use primary constructors for simple data-carrying classes; fall back to full constructors when validation or complex initialization logic is needed.

---

## Common Mistakes

### Coming from C

Treating a `class` like a `struct` and expecting value-copy semantics on assignment. Classes are reference types — assigning one variable to another shares the same object.

### Coming from Java

Assuming default member visibility is package-private, and forgetting to add `public`/`private` explicitly. C# members default to `private`, so a Java-style "no modifier" field becomes inaccessible outside the class, not accessible within the assembly.

```csharp
class Account
{
    decimal balance; // private — NOT internal, unlike Java's package-private default
}
```

---

## Performance Notes

- `sealed` classes allow the JIT to devirtualize method calls, avoiding virtual dispatch overhead in hot paths.
- Classes always allocate on the heap; for small, short-lived, frequently-created data, consider `struct` or `record struct` instead (see Structs, Records).

---

## Related Features

See also:
- Objects
- Constructors
- Inheritance
- Records

---

## Best Practices

- Default to `sealed` unless a class is explicitly designed as a base class.
- Keep fields `private` and expose state through properties.
- Prefer primary constructors for simple, immutable data classes; use full constructor bodies when logic beyond assignment is required.

---

## Common APIs

- `object` (implicit base of every class)
- `System.Object.Equals`, `GetHashCode`, `ToString`

---

## Notes

A class that declares no explicit base class implicitly derives from `object`.

---

## Official Documentation

- [Classes](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/)
- [Static classes and static members](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/static-classes-and-static-class-members)
- [Primary constructors](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-12#primary-constructors)
