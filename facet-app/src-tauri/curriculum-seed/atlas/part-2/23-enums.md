# Enums

Enumerated types, underlying values, and the `[Flags]` bitfield pattern.

---

## Quick Summary

C# `enum` is a distinct value type backed by an integral type (`int` by default), with named constant members. Unlike Java enums (which are full classes that can have fields, methods, and constructors per-value), C# enums are lightweight — closer to C enums, but strongly typed and namespace-scoped, with the addition of a built-in bitfield convention via `[Flags]`.

---

## Syntax

```csharp
public enum DayOfWeek
{
    Sunday,    // 0
    Monday,    // 1
    Tuesday,   // 2
    Wednesday, // 3
    Thursday,  // 4
    Friday,    // 5
    Saturday   // 6
}
```

---

## Syntax Variations

```csharp
// Explicit underlying type and values
public enum StatusCode : byte
{
    Ok = 200,
    NotFound = 404,
    ServerError = 500
}

// [Flags] enum — bitwise-combinable values
[Flags]
public enum Permissions
{
    None    = 0,
    Read    = 1 << 0, // 1
    Write   = 1 << 1, // 2
    Execute = 1 << 2, // 4
    All     = Read | Write | Execute
}

// Enum in a switch expression
string Describe(DayOfWeek day) => day switch
{
    DayOfWeek.Saturday or DayOfWeek.Sunday => "Weekend",
    _ => "Weekday"
};
```

---

## Examples

```csharp
// Casting between enum and underlying integral type
StatusCode code = (StatusCode)404;
int raw = (int)StatusCode.NotFound; // 404
```

```csharp
// [Flags] combination and checking
var userPerms = Permissions.Read | Permissions.Write;
bool canWrite = userPerms.HasFlag(Permissions.Write); // true
Console.WriteLine(userPerms); // "Read, Write" — smart ToString for [Flags]
```

```csharp
// Parsing strings to enums
DayOfWeek day = Enum.Parse<DayOfWeek>("Monday");
bool ok = Enum.TryParse<DayOfWeek>("Frunday", out var result); // false, result = default
```

```csharp
// Iterating all enum values
foreach (DayOfWeek d in Enum.GetValues<DayOfWeek>())
    Console.WriteLine(d);
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Underlying representation | Integral type (`int` default, configurable) | Integral type (`int`, compiler-defined) | ❌ Different — backed by a full class instance, not a primitive |
| Per-value methods/fields | ❌ Not available (plain constants only) | ❌ N/A | ⭐ Java only — each enum constant can override methods, have fields |
| Type safety | ⚠ Similar — strongly typed, but freely castable to/from underlying integer | ❌ Different — plain `int` constants, no type safety | ✅ Same — strongly typed, no implicit int conversion |
| Namespace scoping | ✅ Scoped like any type | ❌ Different — often global unless wrapped | ✅ Scoped |
| Bitfield convention | ⭐ `[Flags]` attribute + smart `ToString`/`HasFlag` | ⚠ Similar — manual bitwise constants, no framework support | ⚠ Similar — `EnumSet`/manual bitmasking, different mechanism |
| Switch exhaustiveness checking | ⚠ Similar — compiler warns on non-exhaustive `switch` expressions | ❌ N/A | ⚠ Similar — Java switch can warn depending on tooling |

---

## Common Patterns

- Use `[Flags]` with powers-of-two values for combinable option sets (permissions, feature toggles).
- Use `Enum.TryParse` (not `Enum.Parse`) when parsing user/external input to avoid exceptions on invalid values.
- Prefer `switch` expressions over `if`/`else if` chains for exhaustive enum-based branching.

---

## Common Mistakes

### Coming from C

Treating a C# enum exactly like a C enum (an untyped set of `int` constants) and casting freely without validation. C# enums are still just as freely castable to/from their underlying type as C's, so **invalid values are possible** (`(DayOfWeek)99` compiles and runs) — always validate with `Enum.IsDefined` when values originate outside the compiler's control (e.g., deserialized data).

### Coming from Java

Expecting to attach per-value behavior (fields, methods, abstract method overrides per constant) the way Java enums allow. C# enums cannot have instance methods or per-value overrides — model that with a class hierarchy, a dictionary lookup, or a switch expression mapping enum values to behavior instead.

```csharp
// Not possible in C#: per-value method overrides like Java's enum constant bodies
// Model behavior externally instead:
Func<double, double> GetOperation(Operation op) => op switch
{
    Operation.Add => (x) => x + 1,
    Operation.Subtract => (x) => x - 1,
    _ => throw new ArgumentOutOfRangeException()
};
```

---

## Performance Notes

- Enums are value types — no heap allocation, comparisons are simple integer comparisons.
- `ToString()` on an enum uses reflection by default and is relatively slow; avoid calling it in hot paths (logging loops, etc.) — cache the string or use source-generated fast paths if needed.

---

## Related Features

See also:
- Types
- Control Flow
- Pattern Matching

---

## Best Practices

- Explicitly assign values for enums that are serialized/persisted (databases, wire formats) so future member reordering doesn't silently change meaning.
- Use `Enum.IsDefined`/`TryParse` to validate values from external/untrusted sources.
- Reserve `[Flags]` for genuinely combinable concepts; don't apply it to mutually exclusive value sets.

---

## Common APIs

- `Enum.Parse`, `Enum.TryParse`, `Enum.GetValues`, `Enum.IsDefined`
- `[Flags]` attribute
- `HasFlag`

---

## Notes

`HasFlag` uses boxing internally and is measurably slower than a direct bitwise AND check (`(value & Permissions.Write) == Permissions.Write`) — prefer the manual bitwise check in performance-sensitive code.

---

## Official Documentation

- [Enumeration types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/enum)
- [Flags attribute usage](https://learn.microsoft.com/en-us/dotnet/api/system.flagsattribute)
- [Enum class](https://learn.microsoft.com/en-us/dotnet/api/system.enum)
