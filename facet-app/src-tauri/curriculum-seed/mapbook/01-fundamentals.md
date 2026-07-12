# C# Fundamentals

You can read C# already, so this chapter doesn't teach `if`/`for`. It teaches the handful of
places C# **thinks differently** from Java and C — the things that, if you get them wrong,
produce bugs you'll stare at for an hour. Each section has the idea, the bridge from what you
know, runnable examples, **where you'd actually use it**, and the traps.

---

## 1. Value types vs reference types

This is C#'s single most important idea. Your C background is the perfect way in.

### The idea
Every type in C# is either a **value type** or a **reference type**, and that decides what
happens when you assign it or pass it to a method.

- **Value type** (`struct`, `enum`, the primitives `int`/`double`/`bool`/`char`): the variable
  *is* the data. Assigning **copies** the whole thing. This is exactly a C `struct` on the stack.
- **Reference type** (`class`, `interface`, arrays, `string`, delegates): the variable holds a
  **reference** (a managed pointer) to an object living on the heap. Assigning copies the
  *reference*, so two variables point at one shared object. This is exactly copying a C pointer.

### See it
```csharp
struct Point { public int X, Y; }      // value type — a C struct
class  Player { public int Hp; }       // reference type — behind a managed pointer

var p1 = new Point { X = 1, Y = 1 };
var p2 = p1;            // COPY — p2 is a separate Point
p2.X = 99;
// p1.X is still 1

var a = new Player { Hp = 100 };
var b = a;             // ALIAS — a and b are the same object
b.Hp = 50;
// a.Hp is now 50 too

System.Console.WriteLine($"p1.X={p1.X}   a.Hp={a.Hp}");   // p1.X=1   a.Hp=50
```

### Where you'll actually meet this
- **Passing a class to a method that mutates it** — the change is visible to the caller,
  because the method got a copy of the *reference*, not the object. This is how, e.g., a method
  can fill in a `List<T>` you passed it.
- **Putting a struct in a list and editing it** — `myList[0].X = 5` won't even compile for a
  struct, because indexing returns a *copy*; you have to replace the whole element. That
  surprise is 100% the value/reference rule.
- **Equality** — two `Player` objects with the same `Hp` are *not* equal (different references);
  two `Point`s with the same fields *are* (value equality). More on this in the OOP chapter.

### Struct or class? A decision rule
Default to **`class`**. Choose **`struct`** only when the type is small, logically a single
*value*, and immutable — coordinates, a money amount, an RGB colour, a date. Everything with
identity or mutable behaviour (a `Player`, a `BankAccount`, a service) is a `class`.

### The C-pointer bridge you asked for
You said pointer-to-pointer still bites. Map it exactly:

| C | C# |
|---|---|
| `Player p;` (a struct value) | `struct` variable |
| `Player* p;` (pointer to it) | `class` reference variable |
| `Player** pp;` (pointer to the pointer) | passing a `class` variable **`by ref`** |

A normal C# reference is already "the pointer." You only need the *pointer-to-pointer* case when
you want a method to **repoint your variable at a different object** — and that's what `ref` on a
reference type does (next section). That's the whole mystery; there's nothing deeper.

### Boxing (the hidden cost)
Assigning a value type to `object` (or a non-generic collection) **boxes** it — copies it onto
the heap behind a reference. Cheap once, expensive in a hot loop. Generics (`List<int>`) exist
partly to avoid this; you rarely box on purpose. Just recognise it when you see `object` holding
an `int`.

> **Try it (lab):** make a `struct Vec { public int X; }` and a `class Box { public int X; }`,
> copy each, mutate the copy, print both originals. Then try `myList[0].X = 5` on a `List<Vec>`,
> read the compiler error, and explain *why* it happens. This one exercise cements the whole idea.

*(Atlas: **Types**, **Structs**.)*

---

## 2. Variables, types, and the numbers you flagged

### `var` is not JavaScript `let`
`var x = 5;` is still **statically typed** — the compiler infers `int` and it's `int` forever.
Use `var` when the type is obvious from the right-hand side (`var list = new List<string>();`),
spell the type out when it aids readability. It never means "dynamic."

### Signed vs unsigned — keep it simple
Default to **`int`** for basically everything, *including counts, sizes, and indices* — that's
what the whole .NET API does (`list.Count` is an `int`). Use:
- `long` when a value might exceed ~2.1 billion (file sizes, timestamps, IDs),
- `uint`/`ulong`/`byte` only for bit manipulation, hashing, or binary/interop.

Don't pick `uint` just because "it can't be negative" — mixing signed and unsigned causes more
bugs than it prevents, and unsigned underflow (`0u - 1` = 4 billion) is nasty.

### Floating point — the one that costs money
```csharp
double a = 0.1 + 0.2;            // 0.30000000000000004  — NOT 0.3
bool wrong = (0.1 + 0.2 == 0.3); // false

decimal price = 19.99m;          // exact, base-10 — the 'm' suffix matters
decimal total = price * 3;       // 59.97 exactly
```
Rules you can live by:
- **`decimal`** for money and anything a human counts in base-10. Exact, slower, ~28 digits.
- **`double`** for maths, science, ratios — fast, but never compare with `==` (compare
  `Math.Abs(a - b) < tolerance`).
- **`float`** only for graphics/memory-bound data where 32 bits is enough.

**Use-case:** a shopping cart, an invoice, an interest calculation → `decimal`, always. Using
`double` for currency is a classic bug that ships to production and loses cents.

> **Try it (lab):** print `0.1 + 0.2` and `0.1 + 0.2 == 0.3`, then redo both with `decimal` and the
> `m` suffix. Seeing `0.30000000000000004` once is worth a paragraph of explanation.

*(Atlas: **Variables**, **Types**, **Operators**.)*

---

## 3. Nullability is part of the type now

Java lets any reference be `null` and you find out at runtime. Modern C# makes nullability a
**compiler-checked** property, so most `NullReferenceException`s become compile-time warnings.

```csharp
string name  = "Ada";     // non-null; compiler warns if you assign null
string? note = null;      // may be null; compiler warns if you use it unchecked
int?   score = null;      // nullable VALUE type (a real Nullable<int>)

int len = note?.Length ?? 0;      // ?. short-circuits on null, ?? gives a fallback
note ??= "n/a";                    // assign only if currently null
```

### Where it shows up
- **API/DTO fields** that are genuinely optional → `string?`. The `?` documents intent *and*
  forces callers to handle the empty case.
- **Database columns** that are nullable map to `int?`, `DateTime?`, etc.
- **The `!` (null-forgiving) operator** (`note!.Length`) tells the compiler "trust me, not null
  here." Use it sparingly — it's you overriding the safety net.

**Trap:** treating the warnings as noise. "It built with a warning" is the C# equivalent of
dereferencing a maybe-`NULL` pointer in C. Turn warnings into errors in real projects.

> **Try it (lab):** take a `string?`, call `.Length` on it without checking, run it on `null` and
> watch it throw. Then fix it two ways — `?.` and a pattern (`if (s is not null)`) — and note how
> the compiler warned you before you even ran it.

*(Atlas: **Nullable Reference Types**.)*

---

## 4. Pattern matching (stop writing if-ladders)

C# `switch` is an **expression** that returns a value and checks you covered the cases.

```csharp
string Describe(int? n) => n switch
{
    null          => "nothing",
    < 0           => "negative",
    0             => "zero",
    > 0 and < 10  => "small",
    _             => "big"          // _ is the default; omit it and the compiler warns
};

// Type + property patterns — great for handling a set of shapes/messages:
decimal Price(object item) => item switch
{
    Book   { Pages: > 500 } => 25m,
    Book                    => 15m,
    Coffee c                => c.Large ? 5m : 3m,
    _                       => throw new System.ArgumentException("unknown item")
};
```

### Where you'll use it
- Turning an enum or a status code into a label/price/action without a wall of `if`.
- Handling a family of types polymorphically at a boundary (parsing a command, routing a
  message) where you don't own the classes.
- `is` patterns for safe casts: `if (obj is Player pl) pl.Hp += 10;` — test and bind in one step.

*(Atlas: **Pattern Matching**, **Control Flow**.)*

---

## 5. Methods and the "C corner"

C# never had output pointers, so it grew keywords — and your C instincts transfer directly.

### The Try-pattern (prefer this over exceptions for expected failure)
```csharp
if (int.TryParse(userInput, out int age))
    System.Console.WriteLine($"in 10 years: {age + 10}");
else
    System.Console.WriteLine("not a number");
```
`out` is a C `int*` you write through. `TryParse`/`TryGetValue` return a `bool` and fill the
`out` — no exception for the common "bad input" case. **Use-case:** validating user input,
dictionary lookups, any "might legitimately not be there."

> **Try it (lab):** parse `"12"`, `"abc"`, and `""` with `int.TryParse` (no `try/catch`). Then
> write the throwing `int.Parse` version wrapped in `try/catch` and feel why the Try-pattern is
> nicer for expected-bad input.

### `ref`, `in`, optional & named args, tuples, local functions
```csharp
void Swap(ref int a, ref int b) { (a, b) = (b, a); }   // ref = caller's variable

double Area(double w, double h = 1.0) => w * h;         // optional param
var r = Area(w: 3, h: 4);                                // named args = readable call sites

(int min, int max) Bounds(int[] xs) => (xs.Min(), xs.Max());   // return several values
var (lo, hi) = Bounds(new[] { 5, 2, 9 });

int Factorial(int n)                                     // a local function — a helper
{                                                        // scoped to its parent, can recurse
    return n <= 1 ? 1 : n * Factorial(n - 1);
}
```
- `ref` — modify the caller's variable (or repoint a reference — the pointer-to-pointer case).
- `in` — pass a big struct read-only by reference (like `const T*`), avoiding a copy.
- **tuples** — a lightweight multi-return without declaring a struct.
- **local functions** — a named helper that only makes sense inside one method; cleaner than a
  private method when it's not reused.

*(Atlas: **Methods**, **Parameters**, **Expression-bodied Members**.)*

---

## 6. Errors and exceptions

### Throw for the exceptional, Try for the expected
- **Throw** when a *precondition is violated* or something truly unexpected happens (a null
  argument, a corrupt file, a failed invariant).
- **Don't throw** for ordinary control flow (bad user input, a missing key) — use the
  Try-pattern; exceptions are expensive and read like GOTO.

```csharp
decimal Withdraw(decimal balance, decimal amount)
{
    if (amount <= 0)      throw new System.ArgumentOutOfRangeException(nameof(amount));
    if (amount > balance) throw new System.InvalidOperationException("insufficient funds");
    return balance - amount;
}

try
{
    var b = Withdraw(100m, 250m);
}
catch (System.InvalidOperationException ex)   // catch ONLY what you can handle
{
    System.Console.WriteLine($"declined: {ex.Message}");
}
finally
{
    // always runs — cleanup that isn't covered by `using`
}
```

**Never** write a bare `catch (Exception) { }` that swallows everything — that's the "ignore the
return code" of C#. Catch the specific type, near where you can actually do something about it.

*(Atlas: **Exceptions**.)*

---

## 7. File I/O (your weak spot — it's small in C#)

The key idea: a file handle is a resource that **must be released**, and `using` guarantees that
even if an exception is thrown. This is C#'s answer to "who calls `fclose`?".

```csharp
using System.IO;

// Whole-file — simplest, great for config/small data:
File.WriteAllText("notes.txt", "line one\n");
string text  = File.ReadAllText("notes.txt");
string[] lines = File.ReadAllLines("notes.txt");
File.AppendAllText("notes.txt", "line two\n");

// Streaming — for big files or line-by-line work; auto-closed at end of scope:
using var writer = new StreamWriter("log.txt", append: true);
writer.WriteLine($"{System.DateTime.Now:o}  started");

using var reader = new StreamReader("big.csv");
string? line;
while ((line = reader.ReadLine()) is not null)
{
    // process one line without loading the whole file into memory
}

// Build paths portably — never hard-code "\" or "/":
string path = Path.Combine("data", "reports", "q1.txt");
bool exists = File.Exists(path);
```

**Use-cases:** loading settings, writing a log, importing/exporting CSV, caching results to disk.
**Traps:** forgetting `using` (leaks the handle / locks the file on Windows); assuming the
working directory (use full or `Path.Combine`d paths); reading a huge file with `ReadAllText`
when you should stream it.

> **Try it (lab):** write three lines to a file, append a fourth, then read them back with a
> streaming `StreamReader` — all inside `using`. Remove the `using` and observe that nothing
> *visibly* breaks; then read why it still matters (the un-released handle / file lock).

*(Atlas: **Files**.)*

---

## Performance notes (worth knowing, not obsessing over)

- **Boxing** (value type → `object`) allocates on the heap. One is nothing; a million in a loop
  is real GC pressure. Generics avoid it — that's a big reason `List<int>` exists.
- **`decimal` is ~10× slower than `double`** for arithmetic. That's fine for money (correctness
  wins), wrong for a physics inner loop. Match the type to the job.
- **`struct` copies cost bytes.** A tiny struct (a `Point`) is cheaper than a heap allocation; a
  *large* struct copied constantly is slower than a class. Keep structs small (≈16 bytes) or make
  them classes.
- **`File.ReadAllText` loads the whole file into memory**; stream (`StreamReader`) for large
  files. Same for `ReadAllLines` vs `File.ReadLines` (the latter is lazy).
- **`string` is immutable** — every `+=` in a loop allocates a new string. Use `StringBuilder`
  when concatenating many pieces.

## Build it (make the chapter real)

Write a tiny **expense tracker** console app — not a toy, a thing you'd actually run:

1. A `record Expense(string Name, decimal Amount, DateTime Date)` (value semantics, `decimal`).
2. Load existing expenses from a CSV file (streaming read); if the file is missing, start empty
   (Try-pattern / `File.Exists`, not an exception).
3. Add a new expense from user input, validating the amount with `decimal.TryParse` and a typed
   exception for a negative value.
4. Print a summary using a `switch` expression to bucket each expense (small/medium/large).
5. Save back to the CSV with a `using` writer.

If that program compiles clean under nullable warnings, uses `decimal` for the money, closes its
file even when you feed it bad input, and its output would convince a skeptic that structs copy
while classes share — you own this chapter, and you've written a real program, not a console toy.
