# Variables

Declaration, initialization, type inference, and mutability of variables.

---

## Quick Summary

C# variables are strongly and statically typed. Types can be written explicitly or inferred with `var` (compile-time inferred, not dynamic). Constants (`const`) are compile-time; `readonly` fields are runtime-assigned-once. Unlike Java, local variables can be `var`-inferred pervasively, and unlike C, declarations can appear anywhere and scoping is block-based with definite-assignment checking.

---

## Syntax

```csharp
int count = 0;
string name = "Alice";
var total = 100;              // inferred as int
const double Pi = 3.14159;    // compile-time constant
readonly int id;              // set once, in constructor
```

---

## Syntax Variations

```csharp
// Explicit type
double price = 19.99;

// var — type inferred from right-hand side
var price = 19.99; // double

// Target-typed new (C# 9+)
List<int> numbers = new();

// Multiple declarations
int x = 1, y = 2, z = 3;

// Deconstruction
var (a, b) = (1, 2);
```

---

## Examples

```csharp
// var requires initialization — type is inferred once, then fixed
var age = 30;        // int
// age = "thirty";   // compile error — still int
```

```csharp
// const vs readonly
public class Config
{
    public const int MaxRetries = 3;       // compile-time, implicitly static
    public readonly string Environment;    // set once, per-instance, at runtime

    public Config(string env) => Environment = env;
}
```

```csharp
// Target-typed new reduces repetition
Dictionary<string, List<int>> map = new();
// vs. Dictionary<string, List<int>> map = new Dictionary<string, List<int>>();
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Type inference | ✅ `var` — static, compile-time | ❌ Not available (pre-C23; `auto` differs) | ⚠ Similar — `var` (Java 10+), local only |
| Compile-time constant | `const` | `#define` / `const` (not always compile-time) | `static final` (with compiler folding) |
| Runtime-once field | `readonly` | ❌ No direct equivalent (`const` is closest but compile-time only) | ⚠ Similar — `final` field |
| Declare-anywhere | ✅ Yes, with definite assignment | ⚠ Similar (C99+) | ✅ Yes |
| Default/uninitialized locals | ❌ Compile error if used unassigned | ❌ Different — reads garbage memory | ❌ Different — compile error, same intent as C# |

---

## Common Patterns

- `var` for local variables when the type is obvious from the right-hand side (`var list = new List<int>();`), explicit type when it improves readability (e.g., numeric literals, method return types that aren't obvious).
- `readonly` for fields that are fixed after construction (immutable-by-convention objects, DI-injected dependencies).
- `const` only for values truly fixed at compile time (mathematical constants, fixed limits) — never for values that might change across versions/assemblies, since `const` is inlined at the call site.

---

## Common Mistakes

### Coming from C

Treating `var` like `void*` or assuming it's dynamically typed. `var` is resolved to a concrete static type at compile time — `var x = 5;` is exactly `int x = 5;` as far as the compiler is concerned.

### Coming from Java

Using `final` reflexes and reaching for `const` everywhere. `const` in C# is inlined into consuming assemblies at compile time — changing a `const` value requires recompiling every dependent assembly. Use `readonly static` for values that may change between releases.

```csharp
// Fragile: consumers must recompile if this changes
public const int Version = 1;

// Safer for values that may evolve
public static readonly int Version = 1;
```

---

## Performance Notes

- `const` values are embedded directly into IL at each usage site — zero runtime lookup cost, but requires recompilation of dependents on change.
- `readonly` fields have normal field-access cost; the compiler only prevents reassignment outside the constructor.

---

## Related Features

See also:
- Types
- Scope
- Operators

---

## Best Practices

- Use `var` when the type is obvious or unimportant to the reader; use explicit types for public APIs and when clarity matters.
- Prefer `readonly` over `const` for anything that isn't a true, permanent constant.
- Initialize variables at declaration when possible to avoid definite-assignment errors.

---

## Common APIs

- N/A (language-level feature)

---

## Notes

Definite assignment is enforced by the compiler: a local variable must be assigned before it's read, or the code fails to compile — this differs from C, where reading uninitialized memory compiles but yields undefined behavior.

---

## Official Documentation

- [Implicitly typed local variables](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/implicitly-typed-local-variables)
- [const keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/const)
- [readonly keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/readonly)
