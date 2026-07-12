# Encapsulation

Access modifiers and information hiding.

---

## Quick Summary

C# offers six accessibility levels: `public`, `private`, `protected`, `internal`, `protected internal`, and `private protected` — more granular than Java's four (public, protected, package-private, private) or C's file-based visibility only. The default for class members is `private`; the default for top-level types is `internal`.

---

## Syntax

```csharp
public class BankAccount
{
    private decimal balance;                 // this class only
    protected string accountType;             // this class + derived classes
    internal string branchCode;                // this assembly only
    protected internal string region;          // this assembly OR derived classes
    private protected string auditFlag;        // this assembly AND derived classes
    public decimal Balance => balance;         // any caller
}
```

---

## Syntax Variations

```csharp
// File-scoped types (C# 11+) — visible only within the declaring file
file class InternalHelper
{
    public static void DoWork() { }
}

// Property-level asymmetric access
public class Account
{
    public decimal Balance { get; private set; }
}

// Explicit interface implementation hides a member from the public type surface
public interface ILogger { void Log(string message); }
public class FileLogger : ILogger
{
    void ILogger.Log(string message) => File.AppendAllText("log.txt", message);
    // Only accessible via an ILogger-typed reference, not FileLogger directly
}
```

---

## Examples

```csharp
// protected internal: accessible within the assembly, or by derived classes anywhere
public class Base
{
    protected internal void Configure() { }
}
```

```csharp
// private protected (C# 7.2+): accessible only within the assembly AND only by derived types
// (stricter than protected internal — an intersection, not a union)
public class Base
{
    private protected void InternalSetup() { }
}
```

```csharp
// file-scoped class — commonly used for source-generator output or
// implementation details that shouldn't leak across files
file class Parser
{
    public static int Parse(string s) => int.Parse(s);
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Visibility levels | ⭐ 6 levels | ❌ File-scope (`static`) vs global only | ❌ Different — 4 levels (public/protected/package-private/private) |
| Default member access | `private` | N/A | ❌ Different — package-private |
| Default top-level type access | `internal` | N/A | ❌ Different — package-private |
| Assembly-scoped visibility | ⭐ `internal` | ❌ N/A | ⚠ Similar — package-private is the closest analog, but scoped by folder/package, not compiled unit |
| Union of protected+internal | ⭐ `protected internal` | ❌ N/A | ❌ Not available |
| Intersection of protected+internal | ⭐ `private protected` (C# 7.2+) | ❌ N/A | ❌ Not available |
| File-local visibility | ⭐ `file` modifier (C# 11+) | ⚠ Similar — `static` at file scope | ❌ Not available |

---

## Common Patterns

- Use `internal` for implementation types not meant to be part of a library's public API surface.
- Use `protected internal`/`private protected` in framework/base-class design to control exactly how derived types outside vs. inside the assembly can extend behavior.
- Use explicit interface implementation to hide members that should only be accessed through an interface, reducing surface-area confusion.

---

## Common Mistakes

### Coming from C

Assuming there's no encapsulation mechanism beyond `static` (file-local) functions. C#'s member-level access modifiers give far more granular control than anything available in C, which has no notion of class-based information hiding at all.

### Coming from Java

Assuming `internal` and Java's package-private are equivalent. `internal` scopes to the entire compiled *assembly* (which can span many namespaces/folders), whereas Java's package-private scopes to a single *package* (folder) — a much smaller unit. There's no direct C# equivalent of Java's package-private.

---

## Performance Notes

Access modifiers are purely a compile-time/metadata concept — they have zero runtime cost. `InternalsVisibleTo` attributes (for exposing `internal` members to test assemblies) also add no runtime overhead.

---

## Related Features

See also:
- Classes
- Properties
- Interfaces

---

## Best Practices

- Default to the most restrictive access level that works; widen only when a real caller needs it.
- Use `[InternalsVisibleTo("MyProject.Tests")]` rather than making test-only members `public`.
- Reserve `protected`/`protected internal` members for genuine extension points in designed-for-inheritance base classes.

---

## Common APIs

- `System.Runtime.CompilerServices.InternalsVisibleToAttribute`

---

## Notes

`private protected` (intersection of protected + internal) is easy to confuse with `protected internal` (union) — the former is stricter (assembly AND subclass), the latter is looser (assembly OR subclass).

---

## Official Documentation

- [Access modifiers](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/access-modifiers)
- [file modifier](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/file)
- [InternalsVisibleTo attribute](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.compilerservices.internalsvisibletoattribute)
