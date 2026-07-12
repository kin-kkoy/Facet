# Interfaces

Interface declaration, default implementations, and explicit implementation.

---

## Quick Summary

Interfaces define a contract of members that implementing types must provide. Since C# 8, interfaces can include default method implementations (similar to Java's `default` methods), static members, and even static abstract members (C# 11+, primarily for generic math). A class/struct can implement any number of interfaces, unlike single class inheritance.

---

## Syntax

```csharp
public interface IShape
{
    double Area();
}

public class Circle : IShape
{
    public double Radius;
    public double Area() => Math.PI * Radius * Radius;
}
```

---

## Syntax Variations

```csharp
// Default interface method (C# 8+)
public interface ILogger
{
    void Log(string message);
    void LogError(string message) => Log($"ERROR: {message}"); // default impl
}

// Multiple interface implementation
public class Widget : ISerializable, IComparable<Widget>, IDisposable
{
    public string Serialize() => "...";
    public int CompareTo(Widget other) => 0;
    public void Dispose() { }
}

// Explicit interface implementation — resolves naming collisions, hides from public surface
public interface IEnglishGreeter { string Greet(); }
public interface IFrenchGreeter { string Greet(); }
public class Bilingual : IEnglishGreeter, IFrenchGreeter
{
    string IEnglishGreeter.Greet() => "Hello";
    string IFrenchGreeter.Greet() => "Bonjour";
}

// Static abstract interface members (C# 11+) — generic math pattern
public interface IAdditionOperators<T> { static abstract T operator +(T a, T b); }
```

---

## Examples

```csharp
// Interface as a capability contract, used polymorphically
public interface INotifiable
{
    void Notify(string message);
}

public class EmailNotifier : INotifiable
{
    public void Notify(string message) => Console.WriteLine($"Email: {message}");
}

public class SmsNotifier : INotifiable
{
    public void Notify(string message) => Console.WriteLine($"SMS: {message}");
}

void Alert(INotifiable notifier, string msg) => notifier.Notify(msg);
```

```csharp
// Default methods let interfaces evolve without breaking existing implementers
public interface IRepository<T>
{
    T GetById(int id);
    IEnumerable<T> GetAll();
    IEnumerable<T> Find(Func<T, bool> predicate) => GetAll().Where(predicate); // new default method
}
```

```csharp
// Explicit implementation requires casting to access
Bilingual b = new Bilingual();
// b.Greet(); // compile error — ambiguous / hidden
IEnglishGreeter eng = b;
Console.WriteLine(eng.Greet()); // "Hello"
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Multiple interface implementation | ✅ Same | ❌ N/A | ✅ Same |
| Default method implementations | ⚠ Similar — C# 8+ | ❌ N/A | ⚠ Similar — Java 8+ `default` methods |
| Static members in interfaces | ✅ Same — C# 8+ | ❌ N/A | ✅ Same — Java 8+ static interface methods |
| Static abstract members | ⭐ C# 11+ (generic math) | ❌ N/A | ❌ Not available |
| Explicit interface implementation | ⭐ C# only | ❌ N/A | ❌ Not available (Java resolves collisions differently, often requires renaming) |
| Fields in interfaces | ❌ Not allowed (properties only) | N/A | ❌ Not allowed (constants only, implicitly `public static final`) |

---

## Common Patterns

- Design small, focused interfaces (Interface Segregation) — `IReadable`, `IWritable` rather than one large `IStorage`.
- Use explicit interface implementation to keep an implementation's "natural" public surface clean when a member is only meant to be used polymorphically.
- Use default interface methods for backward-compatible API evolution in shared libraries.

---

## Common Mistakes

### Coming from C

Trying to simulate interfaces with function pointer structs (`vtable`-style patterns). C# interfaces provide this directly, with compiler-checked contracts and no manual dispatch table management.

### Coming from Java

Expecting all interface members to be implicitly `public` and to always be accessible via the implementing type directly — forgetting that explicit implementation (a C#-only feature) can hide a member so it's only reachable via an interface-typed reference.

---

## Performance Notes

- Interface method calls dispatch through an interface table, similar in cost to virtual method calls — negligible for most code.
- Generic code constrained to an interface (`where T : IShape`) can avoid virtual dispatch entirely when `T` is a `struct`, since the JIT specializes the generic method per value type.

---

## Related Features

See also:
- Classes
- Inheritance
- Polymorphism
- Generics

---

## Best Practices

- Favor composing small interfaces over one large interface.
- Use default interface methods sparingly — they're best for non-breaking API evolution, not primary design.
- Prefer implicit implementation; reach for explicit implementation only to resolve genuine naming collisions or intentionally narrow an API surface.

---

## Common APIs

- `IEnumerable<T>`, `IComparable<T>`, `IEquatable<T>`, `IDisposable`

---

## Notes

Unlike abstract classes, interfaces cannot declare instance fields — only members like properties, methods, events, and (since C# 8) static fields.

---

## Official Documentation

- [Interfaces](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/interfaces)
- [Default interface methods](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/tutorials/default-interface-methods-versions)
- [Static abstract members in interfaces](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-11#static-abstract-members-in-interfaces)
