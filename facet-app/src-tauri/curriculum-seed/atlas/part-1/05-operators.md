# Operators

Arithmetic, logical, null-handling, and overloadable operators.

---

## Quick Summary

C# supports the standard C-family operator set plus several unique ones for null-handling (`??`, `??=`, `?.`) and pattern matching (`is`, `switch` expressions). Operators can be overloaded on user-defined types, and checked/unchecked arithmetic contexts control overflow behavior explicitly.

---

## Syntax

```csharp
// Arithmetic
int sum = a + b;
int rem = a % b;

// Null-conditional / null-coalescing
var length = str?.Length;      // null if str is null
var value = maybe ?? fallback; // fallback if maybe is null
maybe ??= fallback;            // assign fallback only if maybe is null

// Pattern-based
if (obj is string s) { }
var result = x switch { 1 => "one", 2 => "two", _ => "other" };
```

---

## Syntax Variations

```csharp
// Checked / unchecked arithmetic
int max = int.MaxValue;
int overflowed = unchecked(max + 1); // wraps silently
checked
{
    int willThrow = max + 1; // throws OverflowException
}

// Range and index operators (C# 8+)
int[] arr = { 0, 1, 2, 3, 4 };
var last = arr[^1];        // index from end
var slice = arr[1..3];     // range

// Null-forgiving operator
string? maybeNull = GetValue();
string definitelyNotNull = maybeNull!;
```

---

## Examples

```csharp
// Null-conditional chaining avoids nested null checks
Person? person = FindPerson();
string? city = person?.Address?.City;
```

```csharp
// Operator overloading on a user-defined struct
struct Vector2
{
    public double X, Y;
    public static Vector2 operator +(Vector2 a, Vector2 b)
        => new Vector2 { X = a.X + b.X, Y = a.Y + b.Y };
}

var v = new Vector2 { X = 1, Y = 2 } + new Vector2 { X = 3, Y = 4 };
```

```csharp
// Index/range operators for slicing arrays and spans
int[] data = { 10, 20, 30, 40, 50 };
int[] middle = data[1..^1]; // { 20, 30, 40 }
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Operator overloading | ⭐ Supported on user types | ❌ Not available | ❌ Not available |
| Null-coalescing `??` | ⭐ Built-in | ❌ Simulated with ternary | ❌ Not available (Optional patterns instead) |
| Null-conditional `?.` | ⭐ Built-in | ❌ N/A | ❌ Not available |
| Checked/unchecked overflow | ⭐ Explicit contexts | ⚠ Similar — overflow is UB for signed, defined wraparound for unsigned | ⚠ Similar — always silently wraps, no checked mode |
| Ternary `?:` | ✅ Same | ✅ Same | ✅ Same |
| Bitwise/logical operators | ✅ Same (`& \| ^ ~ << >> && \|\|`) | ✅ Same | ✅ Same (plus `>>>` unsigned shift) |

---

## Common Patterns

- Chain `?.` and `??` to safely traverse potentially-null object graphs and provide defaults in one expression.
- Use `switch` expressions (not `switch` statements) for concise value-producing branching.
- Reserve operator overloading for genuinely mathematical/value types (vectors, money, complex numbers) — avoid overloading for unrelated semantics.

---

## Common Mistakes

### Coming from C

Expecting signed integer overflow to be undefined behavior. In C#, overflow is *defined*: it silently wraps in an `unchecked` context (the default) or throws `OverflowException` in a `checked` context.

### Coming from Java

Missing that Java has no operator overloading, so translated code often reaches for verbose method calls (`add()`, `equals()`) where idiomatic C# would overload `+`/`==`. Also, Java's `>>>` (unsigned right shift) has no direct C# operator — cast to `uint`/`ulong` and shift instead.

---

## Performance Notes

- `checked` arithmetic has a small runtime cost (overflow check per operation); reserve it for boundary-sensitive code, not hot loops, unless correctness requires it.
- Null-conditional operators compile to simple branch checks — no measurable overhead versus manual null checks.

---

## Related Features

See also:
- Control Flow
- Pattern Matching
- Nullable Reference Types

---

## Best Practices

- Prefer `is`/`switch` pattern matching over chains of `if`/`else` type checks.
- Use the null-forgiving operator (`!`) sparingly and only when you have information the compiler doesn't.
- Enable `<CheckForOverflowUnderflow>` project-wide only when arithmetic safety is critical (e.g., financial code); otherwise wrap specific blocks in `checked`.

---

## Common APIs

- `Nullable<T>`
- `Math`
- `Index`, `Range`

---

## Notes

The `??=` compound assignment (C# 8+) is the null-coalescing equivalent of `+=`: it assigns only if the left side is currently `null`.

---

## Official Documentation

- [C# operators and expressions](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/)
- [Overloadable operators](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/operator-overloading)
- [Checked and unchecked](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/checked-and-unchecked)
