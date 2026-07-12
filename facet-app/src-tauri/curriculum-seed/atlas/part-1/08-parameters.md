# Parameters

Parameter passing modes: value, `ref`, `out`, `in`, `params`, and optional/named parameters.

---

## Quick Summary

C# offers four parameter-passing modes — by value (default), `ref` (read-write reference), `out` (write-only reference, must be assigned), and `in` (read-only reference) — plus `params` for variadic arguments, and both optional (default-valued) and named parameters. This is substantially richer than C (pointers only) and Java (value-only, no reference parameters at all).

---

## Syntax

```csharp
void ByValue(int x) { }
void ByRef(ref int x) { x++; }
void ByOut(out int x) { x = 42; }
void ByIn(in int x) { /* x is read-only here */ }
void Variadic(params int[] values) { }
void WithDefault(int x = 10) { }
```

---

## Syntax Variations

```csharp
// Calling ref/out — caller must use matching keyword
int a = 1;
ByRef(ref a);

int b;
ByOut(out b); // b need not be initialized before the call

// Inline out variable declaration (C# 7+)
if (int.TryParse("42", out int result))
    Console.WriteLine(result);

// Named arguments — can be reordered, improves call-site readability
void CreateUser(string name, int age = 0, bool isAdmin = false) { }
CreateUser(name: "Alice", isAdmin: true); // age uses default

// params with any enumerable-friendly call
Variadic(1, 2, 3);
Variadic(new[] { 1, 2, 3 });
```

---

## Examples

```csharp
// ref: caller's variable can be read and modified
void Increment(ref int counter) => counter++;

int count = 0;
Increment(ref count);
Console.WriteLine(count); // 1
```

```csharp
// out: common in "TryX" patterns to avoid exceptions for expected failures
bool TryDivide(int a, int b, out int result)
{
    if (b == 0) { result = 0; return false; }
    result = a / b;
    return true;
}

if (TryDivide(10, 2, out int quotient))
    Console.WriteLine(quotient);
```

```csharp
// in: pass a large struct without copying, but prevent mutation
readonly struct Matrix4x4 { /* 16 floats */ }

double Determinant(in Matrix4x4 m) => /* compute without copying m */ 0.0;
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Pass by value (default) | ✅ Same (copies value types; copies reference for reference types) | ✅ Same | ✅ Same |
| Pass by reference | ⭐ `ref`/`out`/`in` keywords, checked by compiler | ⚠ Similar — simulated via pointers, unchecked | ❌ Not available |
| Write-only reference (`out`) | ⭐ C# only — compiler enforces assignment before return | ❌ N/A | ❌ Not available |
| Read-only reference (`in`) | ⭐ C# only | ❌ N/A (`const` pointer is closest) | ❌ Not available |
| Variadic parameters | `params T[]` | `...` (va_args, unsafe/untyped) | ⚠ Similar — `T...` varargs |
| Default parameter values | ⭐ Native | ❌ Not available | ❌ Not available |
| Named arguments | ⭐ Native | ❌ Not available | ❌ Not available |

---

## Common Patterns

- `out` parameters are idiomatic for `TryParse`/`TryGetValue`-style APIs that avoid throwing exceptions for expected failure cases.
- `in` is used for performance-sensitive APIs passing large readonly structs (e.g., math/graphics libraries).
- Named arguments clarify call sites with multiple optional/boolean parameters instead of positional "magic booleans."

---

## Common Mistakes

### Coming from C

Trying to use pointers/`unsafe` for simple reference-parameter needs. `ref`/`out`/`in` cover the vast majority of cases safely, without `unsafe` code or manual address-of operators.

### Coming from Java

Not realizing C# has real reference parameters and instead wrapping single return values in an array or mutable holder object to "simulate" out-parameters, a common Java workaround that's unnecessary in C#.

```csharp
// Unnecessary Java-style workaround
// void GetValue(int[] holder) { holder[0] = 42; }

// Idiomatic C#
void GetValue(out int value) => value = 42;
```

---

## Performance Notes

- `ref`/`in` avoid copying large structs on each call — meaningful for structs larger than a few machine words, called frequently.
- `params` arrays allocate a new array on each call unless the caller passes an existing array — avoid `params` in hot paths where allocation matters.

---

## Related Features

See also:
- Methods
- Types
- Structs

---

## Best Practices

- Use `out` for the "TryX" pattern; use `ref` when a method truly needs to read and write the caller's variable.
- Use `in` only for structs where copy cost is measurable — for small structs (`int`, `Point`), plain by-value is simpler and often just as fast.
- Prefer named/optional parameters over multiple overloads for methods with several configuration options.

---

## Common APIs

- `int.TryParse`, `Dictionary<TKey,TValue>.TryGetValue`

---

## Notes

`ref` and `out` are part of a method's signature for overload resolution purposes, but a method cannot be overloaded on `ref` vs `out` alone — the compiler treats those as conflicting.

---

## Official Documentation

- [Method parameters](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/method-parameters)
- [ref keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/ref)
- [out parameter modifier](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/out-parameter-modifier)
- [in parameter modifier](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/method-parameters#in-parameter-modifier)
