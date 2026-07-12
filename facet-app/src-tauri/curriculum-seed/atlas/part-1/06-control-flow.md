# Control Flow

Branching, looping, and jump statements.

---

## Quick Summary

C# control flow covers the familiar `if`/`else`, `for`, `while`, `do-while`, `foreach`, and `switch`, plus pattern-matching-enhanced `switch` statements/expressions unique to C#. `foreach` works over anything implementing `IEnumerable<T>` (or the duck-typed `GetEnumerator` pattern), not just arrays/collections.

---

## Syntax

```csharp
if (condition) { }
else if (other) { }
else { }

for (int i = 0; i < 10; i++) { }

while (condition) { }

do { } while (condition);

foreach (var item in collection) { }

switch (value)
{
    case 1:
        break;
    default:
        break;
}
```

---

## Syntax Variations

```csharp
// Switch expression (C# 8+) — returns a value, no fallthrough, no break
string category = age switch
{
    < 13 => "child",
    < 20 => "teen",
    _ => "adult"
};

// Pattern matching in switch with type + property patterns
string Describe(object o) => o switch
{
    int n when n < 0 => "negative int",
    int n => $"int {n}",
    string { Length: 0 } => "empty string",
    string s => $"string of length {s.Length}",
    null => "null",
    _ => "unknown"
};

// Goto (rare, but legal)
goto End;
End:
```

---

## Examples

```csharp
// Classic switch statement with pattern matching (C# 7+)
object shape = new Circle(5);
switch (shape)
{
    case Circle c:
        Console.WriteLine($"Circle r={c.Radius}");
        break;
    case Square s:
        Console.WriteLine($"Square side={s.Side}");
        break;
    default:
        Console.WriteLine("Unknown shape");
        break;
}
```

```csharp
// foreach works over any IEnumerable<T>, including custom iterators
foreach (var line in File.ReadLines("data.txt"))
{
    Console.WriteLine(line);
}
```

```csharp
// switch expression with tuple patterns
string Quadrant(int x, int y) => (x, y) switch
{
    ( > 0, > 0) => "I",
    ( < 0, > 0) => "II",
    ( < 0, < 0) => "III",
    ( > 0, < 0) => "IV",
    _ => "origin/axis"
};
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| `if`/`for`/`while`/`do-while` | ✅ Same | ✅ Same | ✅ Same |
| `foreach` | ⭐ Iterates any `IEnumerable<T>` | ❌ Not available | ⚠ Similar — enhanced `for` over `Iterable` |
| `switch` statement fallthrough | ❌ Different — no implicit fallthrough; explicit `goto case` required | ⚠ Similar — implicit fallthrough (needs `break`) | ⚠ Similar — implicit fallthrough (needs `break`) |
| `switch` expression | ⭐ C# only — value-producing, pattern-based | ❌ Not available | ⚠ Similar — Java 14+ arrow-form switch expressions |
| Pattern matching in `switch`/`is` | ⭐ Type, property, tuple, relational patterns | ❌ Not available | ⚠ Similar — Java 21+ record/type patterns, less mature |

---

## Common Patterns

- Prefer `switch` expressions over `switch` statements whenever the goal is producing a value.
- Use `foreach` by default; reach for indexed `for` only when the index itself is needed or when iterating in reverse/skipping.
- Combine pattern matching with `switch` to replace long `if`/`else if` type-check chains.

---

## Common Mistakes

### Coming from C

Expecting `switch` to fall through by default. C# requires each non-empty `case` to end with `break`, `return`, `continue`, `throw`, or `goto case` — implicit fallthrough is a compile error.

```csharp
switch (x)
{
    case 1:
    case 2: // OK: empty case falls through
        DoSomething();
        break;
    case 3:
        DoSomething();
        // break;   // compile error: missing break/fallthrough not allowed here
    case 4:
        DoSomethingElse();
        break;
}
```

### Coming from Java

Forgetting that C#'s `switch` supports rich pattern matching (type patterns, property patterns, relational patterns, tuple patterns) well beyond Java's traditional value-only `switch`, so straight ports often under-use the feature and reimplement it with `if`/`else` chains.

---

## Performance Notes

- `switch` on strings/patterns is compiled to efficient jump tables or hash-based dispatch by the compiler in most cases — no need to hand-optimize.
- `foreach` over arrays and `List<T>` is JIT-optimized to avoid interface dispatch overhead in the common case.

---

## Related Features

See also:
- Operators
- Pattern Matching
- Iterators

---

## Best Practices

- Use switch expressions with a `_` discard for exhaustive, readable branching.
- Avoid `goto` except for breaking out of deeply nested loops (and prefer extracting a method instead).
- Add `when` clauses to `case` patterns instead of nesting an `if` inside the case body.

---

## Common APIs

- `IEnumerable<T>`
- `IEnumerator<T>`

---

## Notes

Switch expressions must be exhaustive or include a `_` discard pattern; the compiler warns (not always errors) on non-exhaustive matches.

---

## Official Documentation

- [Selection statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/selection-statements)
- [Iteration statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements)
- [Pattern matching](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/functional/pattern-matching)
