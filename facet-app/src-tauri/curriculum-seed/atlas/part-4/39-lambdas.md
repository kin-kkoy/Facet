# Lambdas

Anonymous inline functions used to create delegates or expression trees.

---

## Quick Summary

A lambda expression is a concise, inline, unnamed function assignable to a delegate type (`Action`, `Func`, custom delegates) or convertible to an `Expression<TDelegate>` for expression-tree scenarios (e.g., Entity Framework queries). C# lambdas support both expression bodies and block bodies, capture variables from the enclosing scope (closures), and can be declared `static` to explicitly prevent captures.

---

## Syntax

```csharp
// Expression-bodied lambda
Func<int, int> square = x => x * x;

// Block-bodied lambda
Func<int, int> factorial = n =>
{
    int result = 1;
    for (int i = 2; i <= n; i++) result *= i;
    return result;
};

// Multiple parameters
Func<int, int, int> add = (a, b) => a + b;

// No parameters
Action greet = () => Console.WriteLine("Hi");
```

---

## Syntax Variations

```csharp
// Explicit parameter types (rarely needed, inferred by default)
Func<int, int> square = (int x) => x * x;

// Discard parameter
Func<int, int, int> first = (x, _) => x;

// static lambda — compiler enforces no captures
Func<int, int> square = static x => x * x;

// Lambda as expression tree (for LINQ providers like EF Core)
Expression<Func<int, bool>> isEven = x => x % 2 == 0;

// Lambda with attributes (C# 10+)
var f = [MyAttribute] (int x) => x;
```

---

## Examples

```csharp
var numbers = new List<int> { 1, 2, 3, 4, 5 };
var evens = numbers.Where(n => n % 2 == 0).ToList();
```

```csharp
// Closure capturing local state
int threshold = 10;
Func<int, bool> exceedsThreshold = x => x > threshold;
```

```csharp
// static lambda avoiding accidental capture (and its allocation)
List<int> squares = numbers.Select(static x => x * x).ToList();
```

```csharp
// Realistic usage: EF Core expression tree translated to SQL
var activeUsers = dbContext.Users
    .Where(u => u.IsActive && u.LastLogin > DateTime.UtcNow.AddDays(-30))
    .Select(u => u.Name)
    .ToList();
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Inline anonymous function | ⭐ `x => x * x` | ❌ N/A (nested functions/GCC extensions only, non-standard) | ✅ `x -> x * x` (Java 8+ lambdas) |
| Captures enclosing variables | ✅ Yes (closures) | ❌ N/A | ✅ Yes, but only effectively-final variables |
| Can become an expression tree | ⭐ `Expression<Func<T,TResult>>` for query providers | ❌ N/A | ❌ N/A — no built-in expression tree equivalent |
| Explicit no-capture enforcement | ⭐ `static` lambda modifier | ❌ N/A | ❌ N/A |

---

## Common Patterns

```csharp
// LINQ filtering/projection
var names = people.Where(p => p.Age > 18).Select(p => p.Name);

// Sorting with a lambda comparer
list.Sort((a, b) => a.Priority.CompareTo(b.Priority));

// Event subscription with inline lambda
button.Clicked += (sender, e) => Console.WriteLine("Clicked");
```

---

## Common Mistakes

### Coming from C

Assuming lambdas need an explicit function pointer type and manual context struct to "simulate" closures, not realizing C# closures capture variables automatically and safely by reference where needed.

```csharp
// Unnecessary manual context passing, C-style
delegate int Fn(int x, int ctx);
```

Correct approach: capture directly.

```csharp
int ctx = 10;
Func<int, int> fn = x => x + ctx; // ctx captured automatically
```

### Coming from Java

Expecting captured variables to require "effectively final" semantics like Java lambdas — in C#, captured local variables can be reassigned after lambda creation, and the lambda sees the latest value (captured by reference, not by value).

```csharp
int counter = 0;
Action increment = () => counter++;
increment();
increment();
Console.WriteLine(counter); // 2 — mutation is visible, unlike Java's effectively-final rule
```

This surprises Java developers who expect a compile error on mutating a captured variable.

---

## Performance Notes

A lambda that captures variables allocates a closure object (and a delegate) at the point of creation; a non-capturing lambda is cached by the compiler as a static singleton after the first use, so it doesn't reallocate on each call. Marking a lambda `static` lets the compiler enforce zero captures and guarantees no closure allocation. Lambdas converted to `Expression<TDelegate>` are not compiled to IL directly — they build a runtime object graph representing the code, which has its own (higher) allocation cost.

---

## Related Features

See also:

* Delegates
* LINQ
* Events

---

## Best Practices

* Use `static` on lambdas that don't need to capture anything, to avoid accidental captures and closure allocations.
* Prefer expression-bodied lambdas for simple transformations; use block bodies only when multiple statements are genuinely needed.
* Be aware that captured variables are shared by reference — avoid capturing loop variables incorrectly (though `foreach` variables are scoped per-iteration since C# 5).
* Use `Expression<Func<T,TResult>>` only when a provider (like EF Core) requires it — don't overuse for in-memory code where a direct delegate suffices.

---

## Common APIs

Func\<T,TResult\>

Action\<T\>

Expression\<TDelegate\>

Enumerable

---

## Notes

Since C# 5, each iteration of a `foreach` loop gets its own loop variable instance, so lambdas capturing the loop variable behave as most developers intuitively expect — this differs from the pre-C#-5 behavior where all lambdas shared a single captured variable.

---

## Official Documentation

* [Lambda expressions](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/lambda-expressions)
