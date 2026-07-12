# Generics

Generic types, methods, constraints, and variance.

---

## Quick Summary

C# generics are **reified** — a distinct specialized type is generated per value-type argument at runtime (e.g., `List<int>` and `List<double>` are genuinely different compiled types), while reference-type arguments share a single compiled implementation. This is fundamentally different from Java's **type erasure**, where generic type information is stripped at compile time and doesn't exist at runtime at all.

---

## Syntax

```csharp
public class Box<T>
{
    public T Value;
}

public T Identity<T>(T value) => value;

var intBox = new Box<int>();
var result = Identity<string>("hello");
var result2 = Identity("hello"); // type argument inferred
```

---

## Syntax Variations

```csharp
// Multiple type parameters
public class Pair<TKey, TValue>
{
    public TKey Key;
    public TValue Value;
}

// Generic constraints
public class Repository<T> where T : class, IEntity, new()
{
    public T CreateNew() => new T(); // 'new()' constraint enables this
}

// Constraint variations
public void Print<T>(T item) where T : IComparable<T> { }
public class Cache<TKey, TValue> where TKey : notnull { }
public struct Wrapper<T> where T : struct { }
public class NullableBox<T> where T : class? { }

// Variance on interfaces (reference types only)
public interface IProducer<out T> { T Produce(); }     // covariant
public interface IConsumer<in T> { void Consume(T item); } // contravariant
```

---

## Examples

```csharp
// Generic method with type inference — no explicit <T> needed at call site
T Max<T>(T a, T b) where T : IComparable<T> => a.CompareTo(b) > 0 ? a : b;

int m = Max(3, 7);          // inferred as int
string s = Max("a", "b");   // inferred as string
```

```csharp
// 'new()' constraint for factory-style generic code
public class Factory<T> where T : new()
{
    public T Create() => new T();
}
```

```csharp
// Covariance in practice — IEnumerable<out T> allows this assignment
IEnumerable<string> strings = new List<string> { "a", "b" };
IEnumerable<object> objects = strings; // legal because IEnumerable<T> is covariant
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Reification | ⭐ Reified — real specialized types at runtime | ❌ N/A (macros/`void*`, no true generics) | ❌ Different — type-erased, generic type info gone at runtime |
| Value-type generics | ⭐ No boxing — `List<int>` stores raw ints | N/A | ❌ Different — `List<Integer>` boxes every element |
| Runtime type checks (`typeof(T)`) | ✅ Works — `T` is a real type at runtime | N/A | ❌ Not possible — erased, must pass `Class<T>` explicitly |
| Constraints | ⭐ Rich: `class`, `struct`, `new()`, base type, interface, `notnull`, `unmanaged` | ❌ N/A | ⚠ Similar — bounded types (`<T extends Comparable<T>>`), less varied |
| Variance (`in`/`out`) | ⭐ Explicit, declared on the interface/delegate | ❌ N/A | ⚠ Similar — wildcards (`? extends`, `? super`) at the *use* site, not declaration site |
| Overload resolution with generics | Considers actual runtime type identity | N/A | Limited — erasure can cause overload ambiguity/clashes |

---

## Common Patterns

- Use generic constraints (`where T : IComparable<T>`) to enable calling members on `T` inside a generic method/type.
- Use `out`/`in` variance on interfaces (`IEnumerable<out T>`, `IComparer<in T>`) to allow more flexible assignment compatibility.
- Prefer generic collections/methods over `object`-typed APIs to avoid boxing and get compile-time type safety.

---

## Common Mistakes

### Coming from C

Reaching for `void*` and manual casting to simulate generic containers. C# generics provide this safely, with compile-time type checking and — for value types — no per-element overhead from indirection.

### Coming from Java

Assuming `typeof(T)` or runtime type-checks against `T` won't work, based on Java's erasure model. In C#, `T` is a real runtime type — `typeof(T)`, `T is SomeType`, and `default(T)` all work correctly and reliably, since the type parameter is not erased.

```csharp
// Works fine in C#, would require a passed-in Class<T> token in Java
void Describe<T>()
{
    Console.WriteLine(typeof(T).Name);
}
```

---

## Performance Notes

- Value-type generic instantiations (`List<int>`, `Dictionary<int,string>`) are JIT-specialized per type — no boxing, near-native performance.
- Reference-type generic instantiations (`List<string>`, `List<object>`) share a single compiled implementation at the IL level, reducing code bloat compared to full C++-style template instantiation.
- Excessive generic nesting/specialization can increase JIT compilation time and binary size for value-type-heavy generic code — usually not a practical concern outside extreme cases.

---

## Related Features

See also:
- Types
- Interfaces
- List<T>
- Dictionary<TKey,TValue>

---

## Best Practices

- Constrain type parameters as tightly as needed to express intent and enable required operations — avoid over-constraining, which limits reusability.
- Use `out`/`in` variance annotations on your own generic interfaces when read-only-producer or write-only-consumer semantics apply.
- Prefer generics over `object`-based "universal" APIs for type safety and performance.

---

## Common APIs

- `List<T>`, `Dictionary<TKey,TValue>`
- `IComparable<T>`, `IEquatable<T>`, `IEnumerable<T>`
- `Func<T>`, `Action<T>`

---

## Notes

Constraints must be satisfiable by every type argument callers might supply — the compiler enforces constraints at every call site, which is why generic constraints exist (Java relies more on runtime `ClassCastException`s due to erasure).

---

## Official Documentation

- [Generics](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/generics)
- [Constraints on type parameters](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/constraints-on-type-parameters)
- [Covariance and contravariance](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/covariance-contravariance/)
