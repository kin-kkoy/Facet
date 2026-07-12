# Namespaces

Namespace declaration, nesting, and resolution rules.

---

## Quick Summary

Namespaces group related types and prevent naming collisions, similar to Java packages, but with no folder-structure requirement — namespace and file path are independent conventions, not compiler-enforced rules. Namespaces can be nested arbitrarily and reopened across multiple files.

---

## Syntax

```csharp
namespace MyApp.Services
{
    public class OrderService { }
}
```

```csharp
// File-scoped namespace (C# 10+) — applies to the whole file
namespace MyApp.Services;

public class OrderService { }
```

---

## Syntax Variations

```csharp
// Nested namespaces
namespace MyApp
{
    namespace Services
    {
        public class OrderService { }
    }
}

// Equivalent dotted form
namespace MyApp.Services
{
    public class OrderService { }
}

// Reopening a namespace across files is automatic — no special syntax needed
// File A.cs
namespace MyApp.Services;
public class OrderService { }

// File B.cs
namespace MyApp.Services;
public class InvoiceService { } // same namespace, different file
```

---

## Examples

```csharp
// Fully qualified name, avoids a 'using' when there's ambiguity
var logger = new MyApp.Diagnostics.Logger();
```

```csharp
// using static — imports a type's static members directly
using static System.Math;

double area = PI * Pow(radius, 2); // no 'Math.' prefix needed
```

```csharp
// Namespace alias for disambiguating identically-named types
using WinForms = System.Windows.Forms;
using Wpf = System.Windows.Controls;

// WinForms.Button vs Wpf.Button
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Grouping mechanism | `namespace` | ❌ Not available (naming prefixes only) | ⚠ Similar — `package` |
| Folder structure requirement | ❌ Not enforced — convention only | N/A | ❌ Different — folder path must match package exactly |
| Nesting | ✅ Arbitrary dot-separated nesting | N/A | ✅ Arbitrary dot-separated nesting |
| Import scope | `using` applies per-file | `#include` applies per-file (textual) | `import` applies per-file |
| Static member import | ⭐ `using static` | N/A | ⚠ Similar — `import static` |
| Aliasing | ⭐ `using X = Y.Z` | ❌ N/A (`typedef` is closest, type-only) | ❌ Not available |

---

## Common Patterns

- Mirror folder structure to namespace as a convention (most IDEs/templates do this automatically), even though it isn't compiler-enforced.
- Use `using static` for math-heavy or DSL-like code to reduce noise (`Math.Sqrt` → `Sqrt`).
- Use namespace aliases to resolve collisions between libraries that share type names (common with UI frameworks).

---

## Common Mistakes

### Coming from C

Expecting `using` to behave like `#include` — textually pasting file contents. `using` only affects name resolution; it does not include code, and there's no preprocessor-style textual substitution in C#.

### Coming from Java

Assuming the compiler enforces folder-path-matches-namespace the way `javac` enforces folder-matches-package. In C#, a type in `namespace MyApp.Services` can live in any file, in any folder — it's purely organizational.

---

## Performance Notes

Namespaces are a compile-time/metadata concept only — they have zero effect on runtime performance.

---

## Related Features

See also:
- Program Structure
- Files
- Classes

---

## Best Practices

- Follow the `Company.Product.Feature` convention for public/shared libraries.
- Keep folder structure aligned with namespace for discoverability, even though it's optional.
- Use file-scoped namespaces in new code to reduce indentation.

---

## Common APIs

- N/A (language-level organizational feature)

---

## Notes

Root-level types with no `namespace` declaration live in the "global namespace" — acceptable for small scripts/top-level-statement programs, discouraged for libraries.

---

## Official Documentation

- [Namespaces](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/namespaces)
- [using directive](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/using-directive)
- [File-scoped namespaces](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-10#file-scoped-namespace-declaration)
