# Program Structure

How C# source files, namespaces, and compilation units are organized.

---

## Quick Summary

A C# program is one or more `.csproj`-referenced `.cs` files compiled into an assembly. Each file may contain `using` directives, an optional namespace declaration, and any number of types. There is no requirement that file name match type name, and no requirement of one type per file (unlike Java's public-class-per-file rule).

---

## Syntax

```csharp
// using directives
using System;
using System.Collections.Generic;

// file-scoped namespace (C# 10+)
namespace MyApp.Services;

// type declarations
public class OrderService
{
}

public class InvoiceService
{
}
```

---

## Syntax Variations

```csharp
// Block-scoped namespace (traditional)
namespace MyApp.Services
{
    public class OrderService
    {
    }
}

// Global using (C# 10+, usually placed in GlobalUsings.cs)
global using System;
global using System.Linq;

// Implicit usings (enabled via .csproj, no source needed)
// <ImplicitUsings>enable</ImplicitUsings>

// Using alias
using Json = System.Text.Json.JsonSerializer;
```

---

## Examples

```csharp
// GlobalUsings.cs — centralizes common imports for the whole project
global using System;
global using System.Collections.Generic;
global using System.Linq;
global using System.Threading.Tasks;
```

```csharp
// Multiple top-level types in one file — legal in C#
namespace MyApp.Models;

public record Point(int X, int Y);
public record Line(Point Start, Point End);
```

```csharp
// Using alias to resolve ambiguous or verbose type names
using StringBuilder = System.Text.StringBuilder;
using Timer = System.Timers.Timer;
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Compilation unit | Assembly (many files → one `.dll`/`.exe`) | Object file per `.c`, linked | ⚠ Similar — `.class` per top-level type, packaged into `.jar` |
| File-to-type mapping | ❌ No constraint | N/A | ❌ Different — public class name must match file name |
| Namespace/package | `namespace`, dot-separated, no folder requirement | ❌ No concept (prefix conventions only) | ⚠ Similar — `package`, but folder structure is enforced |
| Import mechanism | `using` (namespace-level, not file-level) | `#include` (textual, file-level) | ⚠ Similar — `import` (namespace-level) |
| Global imports | ⭐ `global using` project-wide | ❌ N/A | ❌ Not available |

---

## Common Patterns

- One `GlobalUsings.cs` file per project consolidating `global using` statements.
- File-scoped namespaces in every new file to reduce indentation.
- Grouping related small types (e.g., a record and its companion enum) in a single file when tightly coupled.

---

## Common Mistakes

### Coming from C

Trying to `#include` a `.cs` file. C# has no textual inclusion — visibility is controlled by `namespace`/`using` and assembly references, not file inclusion.

### Coming from Java

Expecting a compile error when a file contains multiple public types or when the file name doesn't match the class name. C# permits both; only nested/inner class rules differ from Java's.

---

## Performance Notes

Namespace and `using` organization has no runtime cost — it is purely a compile-time/name-resolution concern.

---

## Related Features

See also:
- Introduction
- Namespaces
- Files

---

## Best Practices

- Enable `<ImplicitUsings>` and centralize any extra global usings.
- Prefer file-scoped namespaces (`namespace X;`) over block-scoped.
- Keep one primary type per file for discoverability, except for small tightly-coupled companion types.

---

## Common APIs

- `System` (root namespace)
- `System.Linq`
- `System.Threading.Tasks`

---

## Notes

`global using` directives are project-wide once compiled — they apply even to files that don't declare them, as long as they're in the same compilation.

---

## Official Documentation

- [Program structure](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/)
- [Namespaces](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/namespaces)
- [Implicit usings](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/overview#implicit-using-directives)
