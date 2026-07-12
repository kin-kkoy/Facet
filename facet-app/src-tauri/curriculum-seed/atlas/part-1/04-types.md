# Types

The C# type system: value types, reference types, boxing, and nullability.

---

## Quick Summary

C# has a unified type system rooted at `object`, split into **value types** (`struct`, `enum`, primitives — stored inline, copied on assignment) and **reference types** (`class`, `interface`, `delegate`, arrays — stored on the heap, assignment copies the reference). This value/reference distinction is user-extensible (any `struct` you define is a value type) and has no equivalent in Java, where only primitives are value-like.

---

## Syntax

```csharp
// Value types
int i = 5;
double d = 3.14;
bool b = true;
struct Point { public int X, Y; }

// Reference types
class Person { public string Name; }
string s = "hello";   // reference type, despite value-like syntax
object o = new object();

// Nullable value type
int? maybe = null;
```

---

## Syntax Variations

```csharp
// Nullable reference types (C# 8+, project-wide opt-in)
string? nullableName = null;
string nonNullName = "required";

// Boxing / unboxing
int x = 42;
object boxed = x;        // boxing: value type → heap
int unboxed = (int)boxed; // unboxing: heap → value type

// typeof / GetType
Type t1 = typeof(int);
Type t2 = x.GetType();
```

---

## Examples

```csharp
// Value type copy semantics
struct Point { public int X, Y; }

Point p1 = new Point { X = 1, Y = 2 };
Point p2 = p1;       // full copy
p2.X = 99;
Console.WriteLine(p1.X); // 1 — unaffected
```

```csharp
// Reference type sharing semantics
class Box { public int Value; }

Box b1 = new Box { Value = 1 };
Box b2 = b1;          // same object, not a copy
b2.Value = 99;
Console.WriteLine(b1.Value); // 99 — shared
```

```csharp
// Nullable reference types catch null-dereference bugs at compile time
#nullable enable
string? name = GetNameOrNull();
Console.WriteLine(name.Length); // warning: possible null dereference
if (name is not null)
    Console.WriteLine(name.Length); // OK, narrowed
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Value vs reference types | ⭐ User-definable via `struct`/`class` | ⚠ Similar — `struct` (value) vs pointers (reference), but no unified type hierarchy | ❌ Different — only primitives are value types; no user-defined value types (pre Project Valhalla) |
| Root type | `object` — everything derives from it | ❌ No unified root type | ⚠ Similar — `Object`, but primitives excluded |
| Boxing | ⭐ Explicit concept, automatic when needed | ❌ N/A | ⚠ Similar — autoboxing for wrapper types (`Integer`, etc.) |
| Nullable value types | ⭐ `int?` (`Nullable<T>`) | ❌ N/A (any int can be "invalid" only by convention) | ❌ Different — use wrapper classes (`Integer`) which are reference types |
| Nullable reference types | ⭐ Compile-time opt-in annotations (`string?`) | ❌ N/A | ❌ Not in the language (annotations via tooling only, e.g. `@Nullable`) |

---

## Common Patterns

- Use `struct` for small, immutable, frequently-allocated data (coordinates, money amounts, IDs) to avoid GC pressure.
- Use `record` (a reference type by default, or `record struct` for value semantics) when you want value-based equality plus immutability ergonomics.
- Enable `<Nullable>enable</Nullable>` in every new project to get compile-time null-safety warnings.

---

## Common Mistakes

### Coming from C

Assuming a `struct` behaves like a C struct passed by pointer. In C#, structs are passed **by value** by default — passing a large struct to a method copies it entirely unless passed with `ref`/`in`.

```csharp
void Modify(Point p) { p.X = 100; }   // modifies a copy, caller unaffected
void Modify(ref Point p) { p.X = 100; } // modifies the caller's instance
```

### Coming from Java

Assuming all objects are reference types like in Java. `struct`s (including many BCL types like `DateTime`, `TimeSpan`, `Guid`) are value types — mutating a `struct` field of a `readonly` collection element, or via a getter, can silently operate on a temporary copy.

---

## Performance Notes

- Boxing allocates on the heap and incurs GC pressure — avoid boxing value types in hot paths (e.g., putting `int`s into a non-generic `ArrayList` or `object`-typed collection).
- Large structs copied frequently can be *slower* than a reference type — prefer `class` once a struct grows beyond ~16 bytes or is copied often; use `in` parameters to pass large structs by readonly reference.

---

## Related Features

See also:
- Variables
- Structs
- Records
- Nullable Reference Types

---

## Best Practices

- Keep structs small and immutable.
- Enable nullable reference types project-wide.
- Avoid boxing in performance-sensitive code paths; prefer generic collections (`List<int>` not `ArrayList`).

---

## Common APIs

- `object`
- `Nullable<T>`
- `Type`
- `Convert`

---

## Notes

`string` is a reference type but behaves value-like due to immutability and operator overloading (`==` compares content, not reference, for strings).

---

## Official Documentation

- [Value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types)
- [Reference types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/reference-types)
- [Nullable reference types](https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references)
- [Boxing and unboxing](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing)
