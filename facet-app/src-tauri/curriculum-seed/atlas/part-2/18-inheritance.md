# Inheritance

Single class inheritance, base member access, and virtual dispatch.

---

## Quick Summary

C# supports single inheritance for classes (one base class only), with `base.Member` access, constructor chaining via `: base(...)`, and explicit `virtual`/`override`/`new` keywords controlling method dispatch. Unlike Java, method overriding requires explicit opt-in on both the base (`virtual`) and derived (`override`) members — nothing is virtual by default.

---

## Syntax

```csharp
public class Animal
{
    public virtual void Speak() => Console.WriteLine("...");
}

public class Dog : Animal
{
    public override void Speak() => Console.WriteLine("Woof");
}
```

---

## Syntax Variations

```csharp
// Calling the base implementation from an override
public class Cat : Animal
{
    public override void Speak()
    {
        base.Speak();
        Console.WriteLine("Meow");
    }
}

// 'new' hides a base member instead of overriding it (non-polymorphic)
public class Base { public void Show() => Console.WriteLine("Base"); }
public class Derived : Base { public new void Show() => Console.WriteLine("Derived"); }

// sealed override — prevents further overriding down the hierarchy
public class GuardDog : Dog
{
    public sealed override void Speak() => Console.WriteLine("Bark!");
}

// Abstract base member — must be overridden by any concrete derived class
public abstract class Shape
{
    public abstract double Area();
}
public class Circle : Shape
{
    public double Radius;
    public override double Area() => Math.PI * Radius * Radius;
}
```

---

## Examples

```csharp
// Constructor chaining to a base class constructor
public class Vehicle
{
    public string Make;
    public Vehicle(string make) => Make = make;
}

public class Car : Vehicle
{
    public int Doors;
    public Car(string make, int doors) : base(make) => Doors = doors;
}
```

```csharp
// Polymorphism via virtual dispatch — runtime picks the actual type's override
Animal a = new Dog();
a.Speak(); // "Woof" — resolved at runtime based on actual object type
```

```csharp
// 'new' vs 'override' — 'new' breaks polymorphism
Base b = new Derived();
b.Show(); // "Base" — 'new' is resolved at compile time by static type, not runtime type
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Multiple class inheritance | ❌ Not available — single base class only | ❌ N/A (no OOP inheritance) | ❌ Not available — matches C# |
| Default virtuality | ❌ Different — methods are non-virtual unless marked `virtual` | N/A | ❌ Different — all instance methods are virtual by default |
| Override keyword required | ⭐ Yes — `override` mandatory to override a `virtual`/`abstract` member | N/A | ❌ Not required (`@Override` is optional documentation, not enforced) |
| Hiding a base member | ⭐ Explicit `new` keyword required, else compiler warning | N/A | ⚠ Similar — shadowing happens implicitly, no explicit keyword |
| `sealed override` | ⭐ C# only — stops further overriding at a specific level | ❌ N/A | ❌ Not available (only whole-class `final`) |
| Base member access | `base.Member` | N/A | `super.member` |

---

## Common Patterns

- Mark base class methods `virtual` only when derived classes are genuinely expected to customize behavior — default to non-virtual for performance and to avoid fragile base class problems.
- Use `sealed override` to lock down a specific override in a deep hierarchy while still allowing the class itself to be inherited elsewhere.
- Favor composition (see Interfaces) over deep inheritance chains for flexibility.

---

## Common Mistakes

### Coming from C

Not applicable directly (C has no inheritance), but developers coming from C often default to composition/function-pointer patterns even where straightforward inheritance would be simpler and idiomatic in C#.

### Coming from Java

Forgetting that C# methods are non-virtual by default. Porting Java code that relies on implicit polymorphism (every method overridable) will silently fail to override anything in C# unless `virtual`/`override` are added explicitly — the code compiles, but dispatch resolves to the base implementation via `new`-hiding semantics instead of true overriding.

```csharp
// Bug: looks like an override, but 'Speak' isn't virtual in Base — this is unintentional hiding
public class Base { public void Speak() { } }
public class Derived : Base { public new void Speak() { } } // compiler warns, doesn't error
```

---

## Performance Notes

- Non-virtual methods can be inlined/devirtualized by the JIT; `virtual` methods incur a vtable lookup — negligible in most code, but relevant in extremely hot paths.
- `sealed` classes and `sealed override` methods enable further devirtualization opportunities.

---

## Related Features

See also:
- Classes
- Polymorphism
- Interfaces
- Constructors

---

## Best Practices

- Mark classes `sealed` by default; only remove `sealed` (and add `virtual` to specific members) when inheritance is a deliberate design choice.
- Always use `override`, never rely on `new`-hiding unless intentionally breaking polymorphism (rare, and should be commented).
- Prefer interfaces and composition over deep inheritance hierarchies for flexibility and testability.

---

## Common APIs

- `object` (base of all types)
- `System.Attribute` (common base for custom attributes)

---

## Notes

The compiler emits a warning (CS0108) when a derived member hides a base member without either `new` or `override` — always resolve this warning explicitly rather than ignoring it.

---

## Official Documentation

- [Inheritance](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/inheritance)
- [virtual keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/virtual)
- [override keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/override)
