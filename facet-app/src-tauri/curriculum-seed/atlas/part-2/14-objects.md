# Objects

Object instantiation, initializers, and identity vs equality.

---

## Quick Summary

Objects are instances of reference types, created with `new` and living on the managed heap until garbage collected. C# object initializer syntax allows setting properties inline at construction without a matching constructor overload — a convenience not present in C or Java.

---

## Syntax

```csharp
var customer = new Customer();
var customer2 = new Customer { Id = 1, Name = "Alice" }; // object initializer
```

---

## Syntax Variations

```csharp
// Target-typed new (C# 9+) — type inferred from declaration
Customer customer = new() { Id = 1, Name = "Alice" };

// Collection initializer combined with object initializers
var customers = new List<Customer>
{
    new() { Id = 1, Name = "Alice" },
    new() { Id = 2, Name = "Bob" },
};

// with-expression (records / record structs) — non-destructive mutation
var updated = customer with { Name = "Alicia" };
```

---

## Examples

```csharp
// Object initializer runs after the constructor completes
public class Point
{
    public int X { get; set; }
    public int Y { get; set; }
}

var p = new Point { X = 1, Y = 2 };
// Equivalent to:
// var p = new Point();
// p.X = 1;
// p.Y = 2;
```

```csharp
// Reference equality vs value equality
var a = new Point { X = 1, Y = 2 };
var b = new Point { X = 1, Y = 2 };
Console.WriteLine(a == b);          // false — reference equality (default for class)
Console.WriteLine(a.Equals(b));     // false — same, unless Equals is overridden

var c = a;
Console.WriteLine(a == c);          // true — same reference
```

```csharp
// Nested object initializers
public class Order
{
    public Customer Buyer { get; set; }
}

var order = new Order
{
    Buyer = new Customer { Id = 1, Name = "Alice" }
};
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Instantiation | `new TypeName(args)` | `malloc`/struct literal | `new TypeName(args)` |
| Object initializer syntax | ⭐ `new T { Prop = val }` | ⚠ Similar — designated initializers for structs | ❌ Not available (builder pattern used instead) |
| Default equality (`==`) | Reference equality for `class` (unless overridden) | N/A (no objects) | ✅ Same — reference equality by default |
| `with` non-destructive mutation | ⭐ Records/record structs only | ❌ N/A | ❌ Not available |
| Target-typed `new` | ⭐ C# 9+ | N/A | ❌ Not available (`var` inference is return-type only) |

---

## Common Patterns

- Use object initializers for simple, readable construction, especially in tests and configuration/setup code.
- Prefer `with` expressions over manual copy-and-mutate for immutable records.
- Combine collection initializers with object initializers for concise seed data.

---

## Common Mistakes

### Coming from C

Expecting `new T { ... }` to behave like a C struct literal (`(Point){.x=1,.y=2}`), which fully replaces all fields atomically. In C#, an object initializer runs the parameterless constructor first, then assigns each property/field in sequence — intermediate partially-initialized state technically exists (rarely observable, but relevant for constructors with side effects).

### Coming from Java

Reaching for a builder pattern or a large constructor overload set to achieve optional-property construction. C#'s object initializer syntax covers most of these cases natively without extra boilerplate classes.

---

## Performance Notes

- Object initializers compile to the same IL as manual property assignment — no overhead beyond normal object construction.
- Every `new` on a `class` is a heap allocation; batching many small allocations in tight loops can pressure the GC — consider object pooling or `struct`/`record struct` for high-frequency, short-lived objects.

---

## Related Features

See also:
- Classes
- Constructors
- Records
- Equality

---

## Best Practices

- Use object initializers instead of many-parameter constructors for optional/configuration-style properties.
- Override `Equals`/`GetHashCode` (or use `record`) when value-based equality is needed instead of reference equality.
- Prefer `with` expressions for records over manual field-by-field copying.

---

## Common APIs

- `object.Equals`, `object.ReferenceEquals`
- `System.Activator` (reflection-based instantiation)

---

## Notes

`ReferenceEquals(a, b)` always checks identity regardless of any `Equals`/`==` overrides — useful for definitively testing whether two variables point to the same object.

---

## Official Documentation

- [Object and collection initializers](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/object-and-collection-initializers)
- [with expression](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/with-expression)
