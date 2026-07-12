# Extension Methods

Static methods that appear as instance methods on an existing type without modifying it.

---

## Quick Summary

Extension methods let you "add" methods to a type you don't own — including sealed classes, interfaces, and built-in types — without subclassing or recompiling it. They are declared as `static` methods in a `static` class, with the first parameter prefixed by `this`. At the call site, they look like ordinary instance methods, but they compile to plain static method calls.

---

## Syntax

```csharp
public static class StringExtensions
{
    public static bool IsNullOrEmpty(this string? s) =>
        string.IsNullOrEmpty(s);
}

// Usage
string? name = null;
bool empty = name.IsNullOrEmpty();
```

---

## Syntax Variations

```csharp
// Extension method on an interface
public static class EnumerableExtensions
{
    public static IEnumerable<T> WhereNotNull<T>(this IEnumerable<T?> source)
        where T : class =>
        source.Where(x => x is not null)!;
}

// Extension method with additional parameters
public static class IntExtensions
{
    public static int Clamp(this int value, int min, int max) =>
        Math.Max(min, Math.Min(max, value));
}

// Calling as a static method explicitly (always valid)
int clamped = IntExtensions.Clamp(15, 0, 10);
```

---

## Examples

```csharp
public static class StringExtensions
{
    public static string Truncate(this string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength] + "...";
}

string title = "A very long article title";
Console.WriteLine(title.Truncate(10)); // "A very lon..."
```

```csharp
public static class DateTimeExtensions
{
    public static bool IsWeekend(this DateTime date) =>
        date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
}

if (DateTime.Today.IsWeekend()) { }
```

```csharp
// Realistic usage: fluent extension chain over LINQ
public static class QueryableExtensions
{
    public static IQueryable<T> ApplyPaging<T>(
        this IQueryable<T> source, int page, int pageSize) =>
        source.Skip((page - 1) * pageSize).Take(pageSize);
}

var pageResults = dbContext.Orders
    .Where(o => o.IsActive)
    .ApplyPaging(page: 2, pageSize: 20)
    .ToList();
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Adding methods to existing types | ⭐ Extension methods via `this` parameter | ❌ N/A — must write free functions | ❌ No language support (utility classes with static methods are the workaround) |
| Call-site syntax | ⭐ Looks identical to instance method call | ❌ N/A | ❌ N/A — Java requires `Utils.method(obj)` style |
| Applies to interfaces | ⭐ Yes, including built-in `IEnumerable<T>` (LINQ) | ❌ N/A | ❌ No; use default interface methods instead if you own the interface |
| Requires source modification | ⭐ No — extension methods live externally | ❌ N/A | ⚠ Java 8+ default methods require owning the interface |

---

## Common Patterns

```csharp
// LINQ itself is implemented entirely as extension methods on IEnumerable<T>
var evens = numbers.Where(n => n % 2 == 0).ToList();

// Fluent validation extensions
public static class GuardExtensions
{
    public static T ThrowIfNull<T>(this T? value, string paramName) where T : class =>
        value ?? throw new ArgumentNullException(paramName);
}
```

---

## Common Mistakes

### Coming from C

Expecting to need function pointers or macros to simulate "adding" behavior to a struct/type; not realizing C# has first-class syntax for this that still resolves statically (no vtable involved).

```csharp
// Unnecessary — no need for a wrapper struct to add behavior
struct PointWrapper { public Point P; public double Distance() => ...; }
```

Correct approach: write an extension method directly on the existing `Point` type.

```csharp
public static class PointExtensions
{
    public static double DistanceToOrigin(this Point p) =>
        Math.Sqrt(p.X * p.X + p.Y * p.Y);
}
```

### Coming from Java

Creating a `PointUtils` class with static helper methods (`PointUtils.distanceToOrigin(p)`) out of habit, instead of using extension method syntax for better readability and discoverability via IntelliSense/autocomplete.

```csharp
// Java-style utility class — works but less discoverable
public static class PointUtils
{
    public static double DistanceToOrigin(Point p) => ...;
}
PointUtils.DistanceToOrigin(myPoint);
```

Correct approach: use `this` on the first parameter so it appears in autocomplete on the instance.

```csharp
myPoint.DistanceToOrigin();
```

---

## Performance Notes

Extension methods compile to ordinary static method calls — there is no virtual dispatch, no runtime overhead, and no boxing beyond what the method itself does. Resolution is entirely compile-time based on the imported namespaces (`using`).

---

## Related Features

See also:

* Methods
* LINQ
* Interfaces

---

## Best Practices

* Group related extension methods in a dedicated static class, typically named `<Type>Extensions`.
* Keep extension methods pure and side-effect-free where possible, mirroring LINQ's design.
* Don't use extension methods to bypass encapsulation — they can only use the public API of the extended type.
* Prefer instance methods when you own the type; reserve extensions for types you don't own or for fluent composition.

---

## Common APIs

Enumerable

Queryable

String

DateTime

---

## Notes

Extension methods require the containing namespace to be in scope via `using`; unlike instance methods, they are not automatically visible just because the type is visible.

---

## Official Documentation

* [Extension methods](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/extension-methods)
