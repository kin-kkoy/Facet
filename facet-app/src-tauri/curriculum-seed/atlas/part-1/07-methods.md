# Methods

Method declaration, overloading, local functions, and return semantics.

---

## Quick Summary

Methods in C# support overloading, optional/default parameters, `ref`/`out`/`in` reference semantics, and local functions (nested methods scoped to another method). Expression-bodied syntax (`=>`) is idiomatic for single-expression methods. Unlike Java, C# has true `ref`/`out` reference parameters, first-class multiple return values via tuples, and nested local functions.

---

## Syntax

```csharp
returnType MethodName(paramType param1, paramType param2)
{
    // body
    return value;
}

void DoSomething() { }

int Add(int a, int b) => a + b; // expression-bodied
```

---

## Syntax Variations

```csharp
// Local function — nested inside another method
int Outer(int x)
{
    int Square(int n) => n * n;
    return Square(x) + 1;
}

// Static local function (C# 8+) — cannot capture outer variables
int Outer2(int x)
{
    static int Square(int n) => n * n;
    return Square(x);
}

// Multiple return values via tuple
(int min, int max) MinMax(int[] values) => (values.Min(), values.Max());

// ref return (C# 7+) — returns a reference, not a copy
ref int FindFirst(int[] arr, int target)
{
    for (int i = 0; i < arr.Length; i++)
        if (arr[i] == target) return ref arr[i];
    throw new InvalidOperationException();
}
```

---

## Examples

```csharp
// Overloading — resolved at compile time by parameter signature
void Log(string message) => Console.WriteLine(message);
void Log(string message, Exception ex) => Console.WriteLine($"{message}: {ex}");
```

```csharp
// Tuple return, deconstructed at the call site
(int min, int max) = MinMax(new[] { 3, 1, 4, 1, 5 });
Console.WriteLine($"min={min}, max={max}");
```

```csharp
// Local function capturing outer state (closure)
List<int> FilterAboveAverage(List<int> values)
{
    double avg = values.Average();
    bool IsAboveAverage(int v) => v > avg; // captures 'avg'
    return values.Where(IsAboveAverage).ToList();
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Overloading | ✅ Same concept, resolved at compile time | ❌ Not available (name mangling workarounds only) | ✅ Same |
| Default parameters | ⭐ Native support | ❌ Not available | ❌ Not available (overloading used instead) |
| `ref`/`out` parameters | ⭐ True reference parameters | ⚠ Similar — pointers simulate this | ❌ Not available (objects passed by reference-value only) |
| Multiple return values | ⭐ Native tuples `(int, int)` | ❌ Requires structs/out-params | ❌ Requires a wrapper object/array |
| Local functions | ⭐ Nested named functions | ❌ Not standard (GCC nested functions are an extension) | ❌ Not available (lambdas are the closest analog) |
| Expression-bodied methods | ⭐ `=>` syntax | ❌ N/A | ❌ Not available |

---

## Common Patterns

- Use expression-bodied members for one-line computed methods/properties.
- Use tuples for lightweight multi-value returns; use a `record`/class when the return value has meaning beyond the current method.
- Use local functions to encapsulate helper logic that shouldn't be a class-level method or shouldn't be exposed.

---

## Common Mistakes

### Coming from C

Trying to simulate multiple return values with output pointers when C# tuples or `out` parameters do this natively and more safely.

```csharp
// C-style workaround — unnecessary in C#
// void MinMax(int[] arr, int* min, int* max) 

// Idiomatic C#
(int min, int max) MinMax(int[] arr) => (arr.Min(), arr.Max());
```

### Coming from Java

Missing default parameters and reimplementing them via overloads, which Java requires but C# doesn't.

```csharp
// C# — one method, optional parameter
void Connect(string host, int port = 443) { }

// Unnecessary Java-style overload duplication in C#
// void Connect(string host) => Connect(host, 443);
// void Connect(string host, int port) { }
```

---

## Performance Notes

- `ref`/`in` parameters avoid copying large structs — use `in` for read-only large-struct parameters to avoid both the copy and accidental mutation.
- Local functions that don't capture variables are compiled as static methods with no closure allocation; capturing variables allocates a closure object.

---

## Related Features

See also:
- Parameters
- Scope
- Delegates
- Lambdas

---

## Best Practices

- Keep overload sets consistent — overloads of the same name should behave analogously, differing only in convenience.
- Prefer `in` over `ref` when a large struct is passed but not modified.
- Use tuples for internal/private return values; use named types for public API return values.

---

## Common APIs

- `System.Tuple`, `System.ValueTuple`
- `Func<T>`, `Action`

---

## Notes

Overload resolution in C# considers implicit conversions, so ambiguous overloads (e.g., `int` vs `long` vs `double` parameters) can sometimes resolve unexpectedly — the compiler picks the "most specific" applicable overload.

---

## Official Documentation

- [Methods](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/methods)
- [Local functions](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/local-functions)
- [Tuple types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-tuples)
