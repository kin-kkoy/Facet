# Object-Oriented Programming

You know inheritance from Java. This chapter is weighted toward the three pillars you said you
*don't* have — **encapsulation, abstraction, polymorphism** — plus the C# mechanics that make
them pleasant. This is high-leverage: ASP.NET Core, EF Core, and dependency injection are all
built on these ideas, and "Java written in C#" (public fields, deep inheritance) is an instant
junior tell in code review.

---

## 1. Encapsulation — hide the data, expose the behaviour

Encapsulation is *not* "make fields private." It's: an object guards its own **invariants** so no
outside code can put it in an invalid state. You expose *operations*, not raw data.

In Java you write `getBalance()` / `setBalance()`. C# has **properties** — they look like fields
but run code, so you get encapsulation without the ceremony:

```csharp
class BankAccount
{
    public decimal Balance { get; private set; }   // read anywhere, write only inside

    public void Deposit(decimal amount)
    {
        if (amount <= 0) throw new System.ArgumentOutOfRangeException(nameof(amount));
        Balance += amount;                          // the invariant (>= 0) is protected here
    }
}
```

Property flavours you'll use constantly:

```csharp
class Temperature
{
    public double Celsius { get; set; }                       // auto-property
    public double Fahrenheit => Celsius * 9 / 5 + 32;         // computed (read-only), no storage
    public string Label { get; init; } = "";                 // set once, at construction, then frozen
    private int _reads;
    public int Reads { get => _reads; private set => _reads = value; }  // full property with a body
}
```

- `get; set;` — normal read/write.
- `=>` computed property — derived on the fly, no backing field.
- `init` — settable during object creation, immutable after. Great for "configure then freeze."

**Rule of thumb:** public fields are a code smell; expose properties + methods. A setter that
skips validation has thrown encapsulation away.

> **Try it (lab):** write a `class Thermostat` with a private `_target` and a `Target` property whose
> setter clamps to 10–30°C. Prove from outside that you *cannot* set it to 100 — the object defends
> its own rule.

*(Atlas: **Encapsulation**, **Properties**, **Classes**.)*

---

## 2. Abstraction — depend on a concept, not a concrete class

Abstraction is deciding *what* a thing does and deferring *how*. You express the "what" with an
**interface** (a pure contract) or an **abstract class** (contract + shared code):

```csharp
interface IShape { double Area(); }          // the concept — pure contract

abstract class Shape : IShape                // a partial base for a family
{
    public string Name { get; init; } = "";
    public abstract double Area();           // subclasses MUST supply this
    public override string ToString() => $"{Name}: {Area():F2}";   // shared behaviour
}
```

Calling code depends on `IShape` / `Shape`, never on a concrete circle. That's what lets you swap
implementations later — and mock them in unit tests (test doubles implement the interface).

**Interface vs abstract class — the decision:**

| Use an **interface** when… | Use an **abstract class** when… |
|---|---|
| unrelated types share a *capability* (`IDisposable`, `IComparable<T>`) | a family of related types shares *code + state* |
| you need to implement several (a class can implement many) | you have common implementation to inherit (only one base allowed) |

**Real use-case:** this is the backbone of **dependency injection**. A controller depends on
`IEmailSender`; at runtime the app supplies `SmtpEmailSender` (or `FakeEmailSender` in a test).
The controller neither knows nor cares which — that's abstraction paying rent.

> **Try it (lab):** define `interface INotifier { void Send(string msg); }` and two implementations
> (`ConsoleNotifier`, `NullNotifier`). Write a method that takes an `INotifier` and never mentions a
> concrete type. Swap which one you pass and watch behaviour change with zero edits to that method.

*(Atlas: **Interfaces**, **Classes**.)*

---

## 3. Inheritance — you have this; the skill is using it *less*

You know `class Dog : Animal`. The upgrade is knowing **when not to reach for it**. Inheritance
couples a subclass tightly to its base — a change to the base can silently break every subclass.
It's for genuine *is-a* relationships only.

```csharp
abstract class Animal { public abstract string Speak(); public string Name = ""; }
class Dog : Animal { public override string Speak() => "Woof"; }
class Cat : Animal { public override string Speak() => "Meow"; }
```

For *has-a* / *uses-a*, prefer **composition** — hold an object and delegate to it:

```csharp
class Engine { public void Start() { /* ... */ } }
class Car
{
    private readonly Engine _engine = new();   // Car HAS an Engine (not "is an" Engine)
    public void Drive() => _engine.Start();
}
```

"Favour composition over inheritance" is the single most useful OOP maxim. Deep hierarchies
(`class A : B : C : D`) are brittle and hard to follow; a shallow tree plus composition ages far
better. **Contrast with C:** C has no inheritance at all — you compose structs. That instinct is
*correct* far more often than newcomers think.

*(Atlas: **Inheritance**.)*

---

## 4. Polymorphism — one call, many behaviours (the payoff pillar)

This is the pillar that makes the others worth it. A variable typed as the abstraction can hold
any concrete subtype, and the **right override runs at runtime**:

```csharp
class Circle : Shape { public double R { get; init; }
    public override double Area() => System.Math.PI * R * R; }
class Square : Shape { public double S { get; init; }
    public override double Area() => S * S; }

Shape[] shapes = { new Circle { Name = "c", R = 2 }, new Square { Name = "s", S = 3 } };
foreach (var sh in shapes)
    System.Console.WriteLine(sh);      // each prints ITS OWN area — no if/switch on type
```

`virtual` marks a method overridable; `override` supplies the new behaviour; `base.Method()` calls
the parent's version. The magic: that loop has **no idea** which shapes exist, yet does the right
thing for each. Adding a `Triangle` later touches **zero** existing code — you just write a new
class. That "open for extension, closed for modification" property is *why* you program to
abstractions.

**Contrast with Java:** same idea, but note C# methods are **not virtual by default** (Java's
are). You must write `virtual` on the base and `override` on the child — the compiler enforces it,
which prevents accidental overrides.

> **Try it (lab):** build the `Shape` hierarchy above, put mixed shapes in an array, and total their
> areas with `shapes.Sum(s => s.Area())`. Then add a `Triangle` — confirm the totalling code needs
> no change. That "no change" is polymorphism in your hands.

*(Atlas: **Polymorphism**.)*

---

## 5. Records — value objects without the boilerplate

A huge share of real "OOP" is little data-holders: a `Point`, a `Money`, an API DTO. Java finally
got records; C#'s are richer. A `record` gives you **value equality**, a readable `ToString`, and
**non-destructive copying** for free:

```csharp
record Money(decimal Amount, string Currency);      // positional record — one line

var a = new Money(10m, "USD");
var b = a with { Amount = 20m };                    // copy-and-change; a is untouched
bool same = a == new Money(10m, "USD");             // TRUE — compares VALUES, not references
System.Console.WriteLine(a);                         // Money { Amount = 10, Currency = USD }
```

- Use **`record`** for immutable data with no identity (DTOs, events, config, value objects).
- Use **`class`** for things with identity and mutable behaviour (a `BankAccount`, a service).
- `record struct` exists too — a value-type record for small hot-path values.

**Why it matters:** the `with` expression + value equality are exactly what you want for domain
values and for comparing "did this data change?" without writing `Equals`/`GetHashCode` by hand.

> **Try it (lab):** model `record Person(string Name, int Age)`. Make two with the same data and
> check `==` (true). Then `p with { Age = p.Age + 1 }` and confirm the original is unchanged.

*(Atlas: **Records**, **Equality**.)*

---

## Performance notes

- **Classes allocate on the heap; the GC cleans them up.** Fine for normal objects; avoid churning
  millions of tiny short-lived objects in a hot loop (that's GC pressure) — a `record struct` or
  reusing objects helps there.
- **`virtual` calls are a hair slower** than non-virtual (an indirection). Irrelevant for 99% of
  code; only matters in the tightest inner loops.
- **Properties are method calls.** A trivial `get;` is inlined to field speed, but a property with
  real work in the getter runs that work every access — don't hide an expensive computation behind
  an innocent-looking property; make it a method so callers know.

## Build it (make the chapter real)

Model a tiny **payments** domain the OOP way — a real slice, not a toy:

1. `interface IPaymentMethod { Receipt Charge(decimal amount); }`.
2. Two implementations, `CardPayment` and `CashPayment`, selected **polymorphically**.
3. A `record Receipt(string Method, decimal Amount, DateTime When)` (value semantics).
4. A `class Checkout` whose invariant (total never negative; can't charge twice) is enforced
   through methods, not public fields.

Success test: you can **add a third payment method by writing only one new class** — no `switch`
on type anywhere, and `Checkout` doesn't change. When that's true, all four pillars have clicked.
