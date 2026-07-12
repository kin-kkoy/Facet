# Arrays

Single-dimensional, multi-dimensional, and jagged arrays.

---

## Quick Summary

C# arrays are fixed-size, zero-indexed, and reference types (even for arrays of value types) — the array object itself lives on the heap, while its elements are stored inline within it. C# distinguishes **jagged arrays** (`T[][]`, arrays of arrays, each row independently sized) from **multi-dimensional/rectangular arrays** (`T[,]`, a single block with uniform dimensions) — a distinction Java has too, but C's arrays are closer to raw pointer arithmetic with no bounds checking.

---

## Syntax

```csharp
int[] numbers = new int[5];
int[] initialized = { 1, 2, 3, 4, 5 };
int[] initialized2 = new int[] { 1, 2, 3 };
```

---

## Syntax Variations

```csharp
// Rectangular (multi-dimensional) array — uniform size per dimension
int[,] grid = new int[3, 4];
grid[0, 0] = 1;

// Jagged array — array of arrays, each row can differ in length
int[][] jagged = new int[3][];
jagged[0] = new int[] { 1 };
jagged[1] = new int[] { 1, 2, 3 };

// Target-typed array creation (C# 12+ collection expressions)
int[] nums = [1, 2, 3, 4, 5];

// Array with index-from-end and range (C# 8+)
int[] arr = { 0, 1, 2, 3, 4 };
int last = arr[^1];
int[] slice = arr[1..3];
```

---

## Examples

```csharp
// Iterating a rectangular array
int[,] matrix = { { 1, 2 }, { 3, 4 } };
for (int i = 0; i < matrix.GetLength(0); i++)
    for (int j = 0; j < matrix.GetLength(1); j++)
        Console.WriteLine(matrix[i, j]);
```

```csharp
// Array as a reference type — passing shares the same underlying storage
void ZeroOut(int[] arr)
{
    for (int i = 0; i < arr.Length; i++) arr[i] = 0;
}

int[] data = { 1, 2, 3 };
ZeroOut(data);
Console.WriteLine(data[0]); // 0 — caller's array was modified
```

```csharp
// Array covariance (reference types only) — a known footgun
object[] objects = new string[3]; // legal, but risky
// objects[0] = 42; // compiles, throws ArrayTypeMismatchException at runtime
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Bounds checking | ⭐ Always checked — throws `IndexOutOfRangeException` | ❌ Different — no bounds checking, undefined behavior | ✅ Same — always checked |
| Fixed size | ✅ Same (can't resize; use `List<T>` instead) | ✅ Same | ✅ Same |
| Multi-dimensional syntax | ⭐ True rectangular arrays `T[,]` | ⚠ Similar — `T arr[3][4]` is contiguous, but conceptually different | ❌ Different — only jagged arrays exist (`T[][]`) |
| Jagged arrays | ✅ `T[][]` | ⚠ Similar via pointer-to-pointer | ✅ Same — Java's default multi-dim form |
| Reference vs value semantics | Array itself is a reference type | Arrays decay to pointers | ✅ Same — arrays are objects |
| Array covariance | ⚠ Similar — reference-type arrays are covariant, runtime-checked | ❌ N/A | ⚠ Similar — same covariance and same runtime risk |

---

## Common Patterns

- Use jagged arrays (`T[][]`) for performance-sensitive, ragged data — generally faster than rectangular arrays due to simpler memory layout and JIT optimizations.
- Use rectangular arrays (`T[,]`) when data is truly uniform-grid shaped and the fixed-size guarantee is meaningful (e.g., a game board, a matrix).
- Use collection expressions (`int[] x = [1, 2, 3]`) in C# 12+ for concise, target-typed array literals.

---

## Common Mistakes

### Coming from C

Assuming array access has no safety net. C# always bounds-checks array access and throws `IndexOutOfRangeException` on invalid indices — there's no equivalent of C's silent out-of-bounds memory read/write.

### Coming from Java

Assuming `T[,]` and `T[][]` are interchangeable, since Java only has the jagged form. In C#, `int[,] grid` and `int[][] jagged` are genuinely different types with different APIs (`GetLength(dim)` vs `.Length` per row) and cannot be assigned to each other.

---

## Performance Notes

- Rectangular arrays store all elements in one contiguous block — good cache locality for full-grid access patterns, but slightly slower general-purpose indexing than jagged arrays due to extra bounds-check math.
- Jagged arrays involve one allocation per row plus one for the array of row references — more allocations, but often faster iteration due to simpler indexing.
- `Span<T>`/`Array.Copy` are preferred over manual loops for bulk copying — they're implemented with vectorized/optimized code paths.

---

## Related Features

See also:
- Types
- List<T>
- Generics
- Iterators

---

## Best Practices

- Use `List<T>` instead of arrays when the collection size needs to change; use arrays for fixed-size, performance-critical data.
- Prefer jagged arrays over rectangular arrays unless the uniform-grid semantics genuinely matter.
- Avoid array covariance pitfalls — prefer `IReadOnlyList<T>`/generic collections for API surfaces where covariant misuse could cause runtime errors.

---

## Common APIs

- `Array` (static helper methods: `Array.Sort`, `Array.Copy`, `Array.Resize`)
- `Span<T>`, `Memory<T>`

---

## Notes

`Array.Resize` doesn't resize in place — it allocates a new array and copies elements, since arrays are fixed-size by design.

---

## Official Documentation

- [Arrays](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/arrays/)
- [Multidimensional arrays](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/arrays/multidimensional-arrays)
- [Jagged arrays](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/arrays/jagged-arrays)
