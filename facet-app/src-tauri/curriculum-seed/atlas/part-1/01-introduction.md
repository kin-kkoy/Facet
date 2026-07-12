# Introduction

What C# is, how it compiles and runs, and how this atlas is organized.

---

## Quick Summary

C# is a statically-typed, garbage-collected, object-oriented and increasingly functional language running on .NET (CLR). Source compiles to IL (Intermediate Language), which the CLR JITs to native code at runtime. Unlike C, there is no manual memory management; unlike Java, C# has value types, operator overloading, unsafe code, pointers (in `unsafe` blocks), first-class properties, and reified generics (no type erasure).

---

## Syntax

```csharp
// Top-level statements (C# 9+, default in new console projects)
Console.WriteLine("Hello, World!");
```

```csharp
// Traditional entry point (still valid, required for explicit control)
namespace MyApp;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Hello, World!");
    }
}
```

---

## Syntax Variations

```csharp
// Explicit Main with return code
static int Main(string[] args)
{
    return 0;
}

// Async Main
static async Task Main(string[] args)
{
    await Task.Delay(100);
}

// Async Main with args and exit code
static async Task<int> Main(string[] args)
{
    await Task.Delay(100);
    return 0;
}
```

---

## Examples

```csharp
// Minimal program (Program.cs, top-level statements)
Console.WriteLine("Hello, World!");
```

```csharp
// Program with implicit usings + file-scoped namespace
namespace MyApp;

public class Program
{
    public static void Main()
    {
        var items = new List<int> { 1, 2, 3 };
        Console.WriteLine(items.Sum());
    }
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Compilation model | Source → IL → JIT native | Source → native machine code | Source → bytecode → JIT native |
| Memory management | Garbage collected, deterministic disposal via `IDisposable`/`using` | Manual (`malloc`/`free`) | Garbage collected |
| Entry point | `Main` method or top-level statements | ❌ Different — `int main()` | ⚠ Similar — `public static void main(String[] args)` |
| Value vs reference types | ✅ C# only — `struct` (value) vs `class` (reference), user-definable | ⚠ Similar — `struct` is value, everything else pointer-based | ❌ Different — only primitives are value types |
| Generics | ⭐ Reified at runtime | ❌ No generics (macros/void*) | ⚠ Similar — but type-erased |
| Unsafe/pointers | ⭐ Available in `unsafe` blocks | ✅ Native pointers everywhere | ❌ Not available |

---

## Common Patterns

- New projects default to top-level statements and implicit `global using` directives for common namespaces (`System`, `System.Linq`, etc.).
- File-scoped namespaces (`namespace MyApp;`) are preferred over block-scoped namespaces in new code.
- `Main` returning `Task`/`Task<int>` is idiomatic for console apps needing `async` startup (e.g., HTTP clients, DB calls).

---

## Common Mistakes

### Coming from C

Assuming you need manual memory cleanup for every allocated object. In C#, only unmanaged resources (file handles, sockets, native handles) need explicit disposal via `using`; regular objects are reclaimed by the GC.

```csharp
// Wrong mental model: "I must free this"
// Correct: only IDisposable resources need explicit cleanup
using var file = new StreamReader("data.txt");
```

### Coming from Java

Expecting the class name to match the file name, or expecting one public class per file. C# has no such requirement — file names are arbitrary, and multiple public types can live in one file.

---

## Performance Notes

- JIT compilation means a brief "warm-up" cost on first execution; ReadyToRun (R2R) and AOT (Ahead-of-Time) compilation exist to mitigate this for startup-sensitive apps.
- Native AOT (`dotnet publish -p:PublishAot=true`) produces a fully native binary with no JIT/CLR startup cost, at the expense of reflection-heavy features.

---

## Related Features

See also:
- Program Structure
- Namespaces
- Files
- dotnet CLI

---

## Best Practices

- Use top-level statements for small programs/scripts; use explicit `Main` for larger apps needing clear structure.
- Prefer file-scoped namespaces.
- Target the latest LTS .NET release unless constrained.

---

## Common APIs

- `Console`
- `Environment`
- `System.Threading.Tasks.Task`

---

## Notes

.NET (the platform) and C# (the language) are versioned independently. C# 12 ships with .NET 8; language version can be pinned in the `.csproj` via `<LangVersion>`.

---

## Official Documentation

- [A tour of C#](https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/)
- [Top-level statements](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/top-level-statements)
- [.NET overview](https://learn.microsoft.com/en-us/dotnet/core/introduction)
