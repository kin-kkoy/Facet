# Delegates

Type-safe function pointers / method references.

---

## Quick Summary

A delegate is a reference type that holds a reference to one or more methods with a matching signature. Delegates are the foundation of events, LINQ, and callback-based APIs in .NET. C# provides built-in generic delegate types (`Action`, `Func`, `Predicate`) so custom delegate declarations are rarely needed today.

---

## Syntax

```csharp
// Custom delegate declaration
public delegate int Operation(int a, int b);

// Assigning a method
Operation add = (a, b) => a + b;
int result = add(2, 3);

// Built-in generic delegates
Func<int, int, int> multiply = (a, b) => a * b;
Action<string> print = s => Console.WriteLine(s);
Predicate<int> isEven = n => n % 2 == 0;
```

---

## Syntax Variations

```csharp
// Method group conversion (no lambda needed)
int Add(int a, int b) => a + b;
Func<int, int, int> op = Add;

// Multicast delegate
Action notify = () => Console.WriteLine("A");
notify += () => Console.WriteLine("B");
notify(); // invokes both, in order

// Delegate with no return value and no parameters
Action doWork = () => Console.WriteLine("Working");

// Nullable delegate invocation
Action? callback = null;
callback?.Invoke();
```

---

## Examples

```csharp
public delegate void Notify(string message);

class Alarm
{
    public event Notify? OnTriggered;

    public void Trigger() => OnTriggered?.Invoke("Alarm triggered!");
}
```

```csharp
// Func for transformation pipelines
Func<int, int> square = x => x * x;
Func<int, int> increment = x => x + 1;

int result = increment(square(4)); // 17
```

```csharp
// Realistic usage: passing behavior into a method
public static List<T> Filter<T>(List<T> items, Predicate<T> match)
{
    var result = new List<T>();
    foreach (var item in items)
        if (match(item)) result.Add(item);
    return result;
}

var evens = Filter(new List<int> { 1, 2, 3, 4 }, n => n % 2 == 0);
```

```csharp
// Multicast delegate for simple pub/sub without events
Action<string> logger = Console.WriteLine;
logger += msg => File.AppendAllText("log.txt", msg);
logger("Application started");
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Function reference | ⭐ Delegate types (`Action`, `Func`, custom) | ⚠ Raw function pointers (`int (*fn)(int)`) — no type/memory safety | ⚠ Functional interfaces (`Function<T,R>`, `Runnable`) |
| Multicast (multiple targets) | ⭐ Built-in `+=`/`-=` combine multiple methods | ❌ Manual array of function pointers | ❌ Not built-in; must compose manually |
| Type safety | ⭐ Fully type-checked at compile time | ❌ Easy to mismatch signatures, causing UB | ✅ Type-checked via generics |
| Null-safety | ✅ `?.Invoke()` for safe invocation | ❌ Manual null checks, UB on null call | ✅ NullPointerException on null call |

---

## Common Patterns

```csharp
// Callback parameter
void DownloadAsync(string url, Action<string> onComplete) { }

// Comparison delegate
list.Sort((a, b) => a.Name.CompareTo(b.Name));

// Strategy pattern via Func
Dictionary<string, Func<double, double, double>> operations = new()
{
    ["add"] = (a, b) => a + b,
    ["sub"] = (a, b) => a - b,
};
```

---

## Common Mistakes

### Coming from C

Treating delegates like raw function pointers and trying to store/compare them by address, or expecting undefined behavior on signature mismatch — C# delegates are fully type-checked reference types with structural equality on their invocation list.

```csharp
// This won't compile — signature mismatch is caught at compile time
Func<int, int> f = (int a, int b) => a + b; // error
```

Correct approach: match the delegate signature exactly, and rely on the compiler rather than manual pointer arithmetic.

### Coming from Java

Defining a custom `@FunctionalInterface` for every callback shape instead of using the built-in `Action`/`Func` family, leading to unnecessary boilerplate.

```csharp
// Unnecessary custom delegate when Func<T,TResult> already fits
public delegate int Calculator(int a, int b);
```

Correct approach: reuse `Func<int,int,int>` unless a custom delegate name genuinely improves readability or you need `ref`/`out` parameters (which `Func`/`Action` can't express).

---

## Performance Notes

Delegate invocation is a virtual call and involves an allocation when a lambda captures variables (closure) or when a method group is converted for the first time; non-capturing lambdas are cached by the compiler after C# 9 and avoid repeated allocation. Multicast delegates iterate their invocation list sequentially, incurring overhead proportional to the number of subscribers.

---

## Related Features

See also:

* Lambdas
* Events
* LINQ

---

## Best Practices

* Prefer `Action`/`Func`/`Predicate` over custom delegate types unless you need `ref`/`out`/`in` parameters.
* Use `?.Invoke()` to safely call potentially-null delegates.
* Avoid capturing large state in long-lived delegate closures — check for unintended captures that keep objects alive.
* Use events instead of raw public delegate fields for subscriber-based APIs.

---

## Common APIs

Action

Func\<T,TResult\>

Predicate\<T\>

EventHandler

---

## Notes

`Action` and `Func` are generic delegate types defined in `System`, supporting up to 16 parameters (`Func<T1..T16, TResult>`); beyond that, define a custom delegate or use a tuple/record parameter.

---

## Official Documentation

* [Delegates](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/delegates/)
* [Func, Action, and Predicate](https://learn.microsoft.com/en-us/dotnet/api/system.func-2)
