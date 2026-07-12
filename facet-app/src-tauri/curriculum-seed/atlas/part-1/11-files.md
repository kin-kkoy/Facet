# Files

Source file conventions, partial classes/methods, and multi-file type composition.

---

## Quick Summary

C# has no compiler-enforced relationship between file names, paths, and the types they contain — a project's files are simply compiled together into an assembly based on `.csproj` globbing rules. `partial` classes/methods allow a single type to be split across multiple files, useful for generated code, designer files, and large type organization.

---

## Syntax

```csharp
// Program.cs
public partial class Widget
{
    public void Save() { /* ... */ }
}

// Widget.Generated.cs
public partial class Widget
{
    public string Id { get; set; }
}
```

---

## Syntax Variations

```csharp
// Partial methods — declared in one part, optionally implemented in another
public partial class Widget
{
    partial void OnValidate(); // declaration, no body required
}

public partial class Widget
{
    partial void OnValidate() // implementation (optional)
    {
        Console.WriteLine("Validating...");
    }
}

// Partial with modern signatures (C# 9+) can also return non-void with 'partial' pairs
```

---

## Examples

```csharp
// A .csproj implicitly includes all .cs files under the project folder
// No manual file-list maintenance needed (unlike many other build systems)
```

```csharp
// Splitting a large class across files by concern
// Order.cs
public partial class Order
{
    public int Id { get; set; }
    public List<OrderLine> Lines { get; set; } = new();
}

// Order.Pricing.cs
public partial class Order
{
    public decimal CalculateTotal() => Lines.Sum(l => l.Price * l.Quantity);
}
```

```csharp
// Excluding specific files/folders from compilation via .csproj
// <ItemGroup>
//   <Compile Remove="Legacy/**/*.cs" />
// </ItemGroup>
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| File-to-type binding | ❌ No constraint | N/A | ❌ Different — public class name must equal file name |
| Multi-file types (`partial`) | ⭐ C# only | ❌ N/A | ❌ Not available |
| Build file discovery | Implicit glob via `.csproj` SDK-style projects | Explicit list (Makefile) or glob (build tool dependent) | ⚠ Similar — typically glob via build tool (Maven/Gradle), but folder must match package |
| Header/implementation split | ❌ Not applicable — no headers | ✅ `.h`/`.c` split | ❌ Not applicable |

---

## Common Patterns

- Use `partial class` for types with a generated part (e.g., source generators, WPF/WinForms designer files, EF Core scaffolded entities) plus a hand-written part.
- Split very large classes by concern into multiple files (`Order.cs`, `Order.Pricing.cs`, `Order.Validation.cs`) using `partial`.
- Use `<Compile Remove>`/`<Compile Include>` in `.csproj` to control exactly what compiles, for legacy or generated-code scenarios.

---

## Common Mistakes

### Coming from C

Looking for a header/implementation split (`.h`/`.c`). C# has no headers — a type's declaration and implementation are the same file(s); IntelliSense/tooling derive "interfaces" from compiled metadata, not separate declaration files.

### Coming from Java

Assuming each file must contain exactly one public top-level type matching the file name. C# has no such rule — multiple public types can live in one file, and a type's parts can be spread across many files via `partial`.

---

## Performance Notes

File organization has no runtime performance impact — `partial` types are merged entirely at compile time into one type in IL.

---

## Related Features

See also:
- Program Structure
- Namespaces
- Classes

---

## Best Practices

- Use `partial` sparingly for hand-written code — favor composition over splitting a class across many files unless there's a generated-code reason.
- Keep generated and hand-written code in clearly separate files (e.g., `Foo.g.cs` for generated).
- Rely on SDK-style project globbing rather than manually listing every file.

---

## Common APIs

- N/A (project/build-level feature)

---

## Notes

Source Generators (Roslyn) commonly emit `partial` class members, letting hand-written and generated code coexist safely without merge conflicts.

---

## Official Documentation

- [Partial classes and methods](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/partial-classes-and-methods)
- [SDK-style projects](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/overview)
