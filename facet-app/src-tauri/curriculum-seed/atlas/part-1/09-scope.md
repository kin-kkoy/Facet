# Scope

Block scope, variable shadowing rules, and closures.

---

## Quick Summary

C# uses lexical block scoping similar to C and Java, but is stricter about shadowing: a local variable cannot have the same name as another local variable already in scope in an enclosing block within the same method — this is a compile error, unlike Java which permits some shadowing patterns (e.g., fields vs locals) and unlike C where inner-block shadowing of outer locals is legal.

---

## Syntax

```csharp
int x = 1;
{
    int y = 2; // scoped to this block only
}
// y not accessible here

for (int i = 0; i < 10; i++)
{
    // i scoped to the loop
}
// i not accessible here
```

---

## Syntax Variations

```csharp
// Closures capture variables by reference to their storage location
Action print = null;
for (int i = 0; i < 3; i++)
{
    int captured = i;              // new variable each iteration
    print += () => Console.Write(captured);
}
print(); // 012

// Note: capturing the loop variable directly is safe in C# (post C# 5)
// because 'foreach' creates a new variable per iteration since C# 5.
foreach (var n in new[] { 1, 2, 3 })
{
    print += () => Console.Write(n); // captures a fresh 'n' each time — safe
}
```

---

## Examples

```csharp
// Compile error: cannot reuse name from an enclosing scope
void Method()
{
    int value = 1;
    {
        int value = 2; // CS0136: 'value' already defined in this scope
    }
}
```

```csharp
// Local functions and lambdas can capture enclosing variables (closures)
Func<int> MakeCounter()
{
    int count = 0;
    return () => ++count; // captures 'count' by reference to its storage
}

var counter = MakeCounter();
Console.WriteLine(counter()); // 1
Console.WriteLine(counter()); // 2
```

```csharp
// using statement scopes a resource's lifetime to the block
using (var file = new StreamReader("data.txt"))
{
    // file is valid here
} // file.Dispose() called automatically here

// using declaration (C# 8+) — scoped to end of enclosing block
using var file2 = new StreamReader("data.txt");
// file2 disposed at end of containing method/block
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Block scoping | ✅ Same | ✅ Same | ✅ Same |
| Shadowing outer local in inner block | ❌ Different — compile error | ✅ Allowed | ❌ Different — also a compile error (matches C#) |
| Loop variable capture in closures | ⭐ Fresh variable per iteration (`foreach`, and `for` if declared inside) | ❌ N/A (no closures) | ⚠ Similar — effectively-final capture, compile error if reassigned |
| Field vs local shadowing | ⚠ Similar — allowed, resolved via `this.` | ❌ N/A (no fields) | ✅ Allowed, resolved via `this.` |

---

## Common Patterns

- Use `using`/`using var` declarations to scope resource lifetime tightly and guarantee disposal.
- Capture loop-local copies explicitly only when targeting older C# semantics or reasoning about capture timing — modern `foreach` already gives each iteration its own variable.
- Keep lambda/local-function captures minimal to avoid unintended shared mutable state.

---

## Common Mistakes

### Coming from C

Expecting to redeclare a variable name in a nested block the way C permits. C# treats this as an error even though the blocks are lexically nested — the whole method's scope tree is checked for name conflicts, not just the immediately enclosing block.

### Coming from Java

Assuming closures in C# only capture "effectively final" variables like Java lambdas. C# closures can capture and **mutate** outer variables — the captured variable is shared by reference to its storage, not copied.

```csharp
int total = 0;
Action addOne = () => total++; // legal in C#, illegal in Java (must be effectively final)
addOne();
Console.WriteLine(total); // 1
```

---

## Performance Notes

- Capturing variables in a lambda/local function causes the compiler to allocate a closure class on the heap — avoid capturing in extremely hot loops if allocation-free code is required.
- `using var` disposal happens at scope exit, which for loops can mean many rapid alloc/dispose cycles — profile before assuming needless overhead.

---

## Related Features

See also:
- Variables
- Methods
- Lambdas

---

## Best Practices

- Prefer `using var` for deterministic resource cleanup over manual `try`/`finally`.
- Keep variable names distinct across nested scopes to sidestep shadowing errors entirely.
- Be deliberate about what a lambda captures — extract to a local function with explicit parameters if capture semantics get confusing.

---

## Common APIs

- `IDisposable`
- `Action`, `Func<T>`

---

## Notes

Since C# 5, `foreach` loop variables are scoped per-iteration by default, resolving a historic closure-capture footgun that existed in C# 1–4.

---

## Official Documentation

- [Scope (C# reference)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/variables#943-scopes)
- [using statement](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/using)
- [Anonymous functions and captured variables](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/lambda-expressions#capture-of-outer-variables)
