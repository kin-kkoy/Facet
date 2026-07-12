# Appendix B — C → C# Cheat Sheet

Quick side-by-side mappings for developers coming from C.

---

## Quick Summary

C# looks superficially similar to C (braces, semicolons, `if`/`for`/`while`) but differs fundamentally in memory management, type safety, and standard library scope. This sheet maps common C idioms to their C# equivalents.

---

## Memory & Types

| C | C# | Notes |
|---|---|---|
| `int*` / manual malloc/free | `class`/managed reference types | GC-managed; no manual `free` needed |
| `struct` (value, always stack unless pointed to) | `struct` (value type) or `class` (reference type) | Choose explicitly; `struct` in C# is still copy-by-value |
| `char*` (null-terminated) | `string` (immutable, length-prefixed) | No manual null-termination or buffer sizing |
| `NULL` | `null` | Reference types only, unless using `Nullable<T>`/`T?` for value types |
| `#define CONST 5` | `const int Const = 5;` | Compile-time constant, type-checked |
| `typedef struct {...} Point;` | `record Point(int X, int Y);` or `struct Point {...}` | Records add value equality, deconstruction |
| Fixed-size arrays `int arr[10];` | `int[] arr = new int[10];` | Heap-allocated, bounds-checked |
| `union` | `[StructLayout(LayoutKind.Explicit)]` struct | Rarely needed; explicit interop scenario only |

---

## Functions & Control Flow

| C | C# | Notes |
|---|---|---|
| Function pointers `int (*fn)(int)` | `delegate`, `Func<T,TResult>`, `Action<T>` | Type-safe, multicast-capable |
| `void func(int a, int b)` | `void Func(int a, int b)` | PascalCase convention for method names |
| `#include <header.h>` | `using Namespace;` | Namespace import, not file inclusion |
| Macros for generics (`#define MAX(a,b) ...`) | Generic methods `T Max<T>(T a, T b)` | Type-checked, no macro expansion pitfalls |
| `goto` | `goto` (supported, rarely used) | Exists but discouraged; pattern matching/loops preferred |
| `switch` with fallthrough | `switch` (no implicit fallthrough) | Each case must `break`/`return`/`goto case` |

---

## Error Handling

| C | C# | Notes |
|---|---|---|
| Return codes / `errno` | Exceptions (`try`/`catch`/`throw`) | Structured, cannot be silently ignored the way a return code can |
| `assert()` | `Debug.Assert()` / exceptions | `Debug.Assert` compiled out in Release by default |
| Manual cleanup with `goto cleanup;` | `using`/`try`-`finally` | Deterministic disposal via `IDisposable` |

---

## Common Patterns

```csharp
// C: manual struct + free-standing functions
// typedef struct { double x, y; } Point;
// double distance(Point a, Point b) { ... }

// C#: methods on the type itself, or extension methods
public record Point(double X, double Y)
{
    public double DistanceTo(Point other) =>
        Math.Sqrt(Math.Pow(X - other.X, 2) + Math.Pow(Y - other.Y, 2));
}
```

```csharp
// C: manual resource cleanup
// FILE* f = fopen("data.txt", "r");
// ... 
// fclose(f);

// C#: guaranteed disposal
using var reader = new StreamReader("data.txt");
```

---

## Common Mistakes

* Expecting manual memory management — the GC reclaims managed objects; there is no `free`/`delete` for ordinary objects.
* Expecting uninitialized locals to silently contain garbage — C# requires definite assignment before use (compile error otherwise).
* Expecting `switch` fallthrough by default — C# requires explicit `goto case` for fallthrough behavior.
* Assuming array bounds aren't checked — C# throws `IndexOutOfRangeException` rather than allowing undefined behavior.

---

## Related Features

See also:

* Types
* Exceptions
* Structs
* File I/O

---

## Official Documentation

* [C# for C/C++ developers](https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/)
