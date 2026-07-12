# Constructors

Instance constructors, static constructors, constructor chaining, and primary constructors.

---

## Quick Summary

C# supports instance constructors (including overloads), a single parameterless `static` constructor per type (run once, lazily, before first use), and constructor chaining via `: this(...)` and `: base(...)`. Primary constructors (C# 12+) let a class or struct declare constructor parameters directly in the type header.

---

## Syntax

```csharp
public class Point
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
// Constructor chaining with 'this'
public class Point
{
    public int X, Y;
    public Point() : this(0, 0) { }
    public Point(int x, int y) { X = x; Y = y; }
}

// Calling a base constructor with 'base'
public class Point3D : Point
{
    public int Z;
    public Point3D(int x, int y, int z) : base(x, y) { Z = z; }
}

// Static constructor — runs once, before first use of the type
public class Config
{
    public static readonly string Environment;
    static Config()
    {
        Environment = LoadFromDisk();
    }
    static string LoadFromDisk() => "production";
}

// Primary constructor (C# 12+)
public class Point2(int x, int y)
{
    public int X => x;
    public int Y => y;
}
```

---

## Examples

```csharp
// Overloaded constructors with chaining to avoid duplicated init logic
public class Rectangle
{
    public double Width, Height;

    public Rectangle(double side) : this(side, side) { }        // square
    public Rectangle(double width, double height)
    {
        Width = width;
        Height = height;
    }
}
```

```csharp
// Static constructor for one-time, lazy static initialization
public class Logger
{
    private static readonly StreamWriter _writer;

    static Logger()
    {
        _writer = new StreamWriter("app.log", append: true);
    }

    public static void Log(string message) => _writer.WriteLine(message);
}
```

```csharp
// Primary constructor parameters are in scope for the whole class body
public class Employee(string name, decimal baseSalary)
{
    public string Name { get; } = name;
    public decimal Salary { get; private set; } = baseSalary;

    public void GiveRaise(decimal amount) => Salary += amount; // uses primary ctor param indirectly via field
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Instance constructors | ✅ Same concept, overloadable | ❌ N/A (init functions by convention) | ✅ Same |
| Constructor chaining | `: this(...)` / `: base(...)` | ❌ N/A | ⚠ Similar — `this(...)` / `super(...)` as first statement in body |
| Static constructor | ⭐ `static ClassName()`, runs lazily once | ❌ N/A | ⚠ Similar — static initializer blocks, run at class-load time |
| Primary constructors | ⭐ C# 12+ | ❌ N/A | ❌ Not available |
| Default (implicit) constructor | ✅ Provided if no constructor declared | N/A | ✅ Same |

---

## Common Patterns

- Chain constructors with `: this(...)` to centralize validation/default logic in one "master" constructor.
- Use static constructors for expensive one-time setup of `static readonly` fields that can't be initialized inline.
- Use primary constructors for simple types where all state derives directly from constructor parameters.

---

## Common Mistakes

### Coming from C

Looking for an explicit "destructor" to pair with the constructor for cleanup. C# has finalizers (`~ClassName()`), but they run non-deterministically under GC — real deterministic cleanup uses `IDisposable`/`using`, not a constructor/destructor pair (see Exceptions, Scope).

### Coming from Java

Expecting static initializer blocks (`static { ... }`) — C# instead requires a named static constructor `static ClassName() { ... }`, which the runtime guarantees to run at most once, lazily, before the type is first accessed (not necessarily at class-load time, unlike Java, which can run eagerly on class load).

---

## Performance Notes

- The runtime guarantees a static constructor runs exactly once and is thread-safe automatically — no manual locking needed for one-time static initialization.
- Excessive constructor chaining depth has negligible runtime cost; it's a compile-time convenience only.

---

## Related Features

See also:
- Classes
- Objects
- Inheritance

---

## Best Practices

- Validate constructor arguments early and throw `ArgumentException`/`ArgumentNullException` for invalid input.
- Prefer primary constructors for small, immutable data types; use traditional constructors when validation logic is non-trivial.
- Avoid heavy work in static constructors — exceptions thrown there are wrapped in `TypeInitializationException` and can be hard to diagnose.

---

## Common APIs

- N/A (language-level feature)

---

## Notes

If a static constructor throws, the type becomes unusable for the remainder of the process — subsequent accesses throw `TypeInitializationException` even if the underlying cause was transient.

---

## Official Documentation

- [Instance constructors](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/instance-constructors)
- [Static constructors](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/static-constructors)
- [Primary constructors](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-12#primary-constructors)
