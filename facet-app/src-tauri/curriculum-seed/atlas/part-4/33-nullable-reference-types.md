# Nullable Reference Types

Compiler-enforced null-safety annotations for reference types.

---

## Quick Summary

Nullable Reference Types (NRT) is a compile-time flow analysis feature, not a runtime feature. When enabled, reference types (`string`, `List<T>`, custom classes) are treated as non-nullable by default, and you must explicitly opt in with `?` to allow `null`. The compiler emits warnings (not errors) when it detects a possible null dereference or an assignment that violates nullability intent. Unlike `Nullable<T>` for value types, NRT adds no runtime wrapper — it is purely static analysis erased at compile time.

---

## Syntax

```csharp
#nullable enable

string name = "Alice";     // non-nullable reference type
string? nickname = null;   // nullable reference type

void Print(string s) { }          // s must not be null
void Print(string? s) { }         // s may be null
```

Enabling per-project (recommended, in `.csproj`):

```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
</PropertyGroup>
```

Enabling per-file:

```csharp
#nullable enable
#nullable disable
#nullable restore
```

---

## Syntax Variations

```csharp
// Null-forgiving operator: suppress a specific warning
string? maybe = GetName();
string definite = maybe!;

// Null-conditional operator
int? len = maybe?.Length;

// Null-coalescing
string result = maybe ?? "default";

// Null-coalescing assignment
maybe ??= "fallback";
```

---

## Examples

```csharp
#nullable enable

class Person
{
    public string Name { get; set; } = "";      // non-nullable, initialized
    public string? MiddleName { get; set; }     // nullable, no init needed
}
```

```csharp
string? FindUser(int id)
{
    // returns null if not found
    return id == 1 ? "Alice" : null;
}

string? user = FindUser(2);
if (user is not null)
{
    Console.WriteLine(user.Length); // safe, compiler narrows to non-null
}
```

```csharp
// Generic constraints with nullability
void PrintAll<T>(List<T> items) where T : notnull
{
    foreach (var item in items)
        Console.WriteLine(item);
}
```

```csharp
// Realistic usage: API-style method
public string? TryGetConfigValue(string key)
{
    return _settings.TryGetValue(key, out var value) ? value : null;
}

var value = TryGetConfigValue("Timeout") ?? "30";
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Null-safety enforcement | ⭐ Compile-time flow analysis via `?` annotations | ❌ No concept; any pointer may be null | ⚠ `@Nullable`/`@NonNull` annotations exist but are third-party/IDE-only, not compiler-enforced by default |
| Runtime representation | ✅ No runtime difference; erased at compile time | ❌ N/A | ✅ Same — annotations are erased (unless using `Optional<T>`) |
| Default nullability | ⭐ Non-null by default when NRT enabled | ❌ Every pointer is nullable | ⚠ Every reference is nullable by default |
| Enforcement strength | ⚠ Warnings only, not errors | ❌ None | ⚠ Warnings only (via linters like NullAway, Checker Framework) |
| Explicit optional type | ⭐ `T?` for both value and reference types (different mechanisms) | ❌ N/A | ⚠ `Optional<T>` (separate wrapper type, mainly for return values) |

---

## Common Patterns

```csharp
// Guard clause pattern
public void Process(string? input)
{
    ArgumentNullException.ThrowIfNull(input);
    // input is now known non-null below this point
    Console.WriteLine(input.Length);
}
```

```csharp
// Nullable in records
public record User(string Name, string? Email);
```

```csharp
// Nullable with LINQ
var firstOrNull = items.FirstOrDefault(x => x.IsActive); // T? for reference types
```

---

## Common Mistakes

### Coming from C

Treating every `string`/object reference as implicitly nullable, and defensively null-checking everything even when NRT already guarantees non-null. This adds noise and hides real warnings.

```csharp
// Unnecessary check — name is non-nullable string
void Print(string name)
{
    if (name == null) return; // dead code once NRT is enabled correctly
}
```

Correct approach: trust the annotation. If a value truly can be null, mark it `string?` and let the compiler flag misuse.

### Coming from Java

Assuming `Optional<T>`-style semantics apply to plain `T?`. In C#, `string?` is just an annotated `string` — it can still be null at runtime if the null-forgiving operator (`!`) or unannotated external code introduces one. NRT is not a runtime guarantee like `Optional`.

```csharp
// This compiles but can still NRE at runtime
string? s = ExternalLibraryCall()!; // suppressing a legitimate warning
Console.WriteLine(s.Length);
```

Correct approach: reserve `!` for cases you've verified are safe, and audit third-party APIs without NRT annotations (they're treated as "oblivious" and won't warn).

---

## Performance Notes

NRT has zero runtime cost — it is purely a compile-time analysis, erased entirely from IL. There is no boxing, no wrapper allocation, and no difference in generated code between `string` and `string?`.

---

## Related Features

See also:

* Pattern Matching
* Generics
* Structs

---

## Best Practices

* Enable `<Nullable>enable</Nullable>` project-wide for all new projects.
* Treat nullable warnings as errors in CI (`<WarningsAsErrors>Nullable</WarningsAsErrors>`) for stricter enforcement.
* Avoid `!` (null-forgiving operator) except where you have verified external invariants.
* Prefer `ArgumentNullException.ThrowIfNull` for public API boundaries rather than silent `?.` chains.
* Annotate your own public APIs fully so consumers get accurate warnings.

---

## Common APIs

ArgumentNullException

Nullable\<T\>

Enumerable.FirstOrDefault

Dictionary\<TKey,TValue\>.TryGetValue

---

## Notes

NRT annotations are metadata-only (via `[Nullable]` and `[NullableContext]` attributes in the compiled assembly), so downstream consumers using an NRT-aware compiler still get warnings even when consuming your library.

---

## Official Documentation

* [Nullable reference types](https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references)
* [Nullable reference types migration strategies](https://learn.microsoft.com/en-us/dotnet/csharp/nullable-migration-strategies)
