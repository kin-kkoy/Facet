# Stack&lt;T&gt;

The generic LIFO (last-in, first-out) collection.

---

## Quick Summary

`Stack<T>` is a last-in-first-out collection backed by a resizable array, giving O(1) amortized `Push`/`Pop`/`Peek`. It's the direct analog of Java's `ArrayDeque` used as a stack (Java's legacy `java.util.Stack` is generally discouraged in favor of `Deque`). C# also provides `ConcurrentStack<T>` for thread-safe scenarios.

---

## Syntax

```csharp
Stack<int> stack = new Stack<int>();
stack.Push(1);
stack.Push(2);
int top = stack.Pop(); // 2
```

---

## Syntax Variations

```csharp
// Peek without removing
int top = stack.Peek();

// Try-based access (no exceptions on empty stack)
if (stack.TryPop(out int value))
    Console.WriteLine(value);

if (stack.TryPeek(out int peeked))
    Console.WriteLine(peeked);

// Creating from an existing sequence — note: enumeration order becomes reversed
// (the LAST element of the source becomes the FIRST popped)
var stack2 = new Stack<int>(new[] { 1, 2, 3 }); // Pop() order: 3, 2, 1

// Thread-safe variant
System.Collections.Concurrent.ConcurrentStack<int> concurrentStack = new();
concurrentStack.Push(1);
concurrentStack.TryPop(out int result);
```

---

## Examples

```csharp
// Classic depth-first traversal using Stack<T>
Stack<TreeNode> toVisit = new Stack<TreeNode>();
toVisit.Push(root);

while (toVisit.Count > 0)
{
    var node = toVisit.Pop();
    Process(node);
    foreach (var child in node.Children)
        toVisit.Push(child);
}
```

```csharp
// Balanced-parentheses check — a classic Stack<T> use case
bool IsBalanced(string s)
{
    var stack = new Stack<char>();
    foreach (var c in s)
    {
        if (c == '(') stack.Push(c);
        else if (c == ')')
        {
            if (!stack.TryPop(out _)) return false;
        }
    }
    return stack.Count == 0;
}
```

```csharp
// Undo-stack pattern
Stack<string> undoHistory = new Stack<string>();
undoHistory.Push("state1");
undoHistory.Push("state2");
string lastState = undoHistory.Pop(); // "state2"
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Dedicated stack type | ⭐ `Stack<T>` | ❌ N/A (manual array/linked-list implementation) | ⚠ Similar — legacy `java.util.Stack` (discouraged) or `Deque<T>` (preferred) |
| Underlying structure | Resizable array | N/A | ⚠ Similar — `ArrayDeque` is also array-backed |
| `Push`/`Pop` naming | ✅ Same terminology | N/A | ⚠ Similar — `push`/`pop` on `Deque`, but `push`/`pop`/`add`/`remove` are inconsistent across Java's `Stack` vs `Deque` |
| Exception-free access | ⭐ `TryPop`/`TryPeek` | N/A | ⚠ Similar — `Deque.poll()` returns `null` instead of throwing |
| Thread-safe variant | ⭐ `ConcurrentStack<T>` | ❌ N/A | ⚠ Similar — no direct `ConcurrentStack`; typically `ConcurrentLinkedDeque` |

---

## Common Patterns

- Use `Stack<T>` for depth-first traversal, expression evaluation (shunting-yard, bracket matching), and undo/redo history.
- Prefer `TryPop`/`TryPeek` over `Pop`/`Peek` when an empty stack is an expected, non-exceptional condition.
- Use `ConcurrentStack<T>` instead of manually locking a `Stack<T>` for multi-threaded producer/consumer patterns.

---

## Common Mistakes

### Coming from C

Implementing a stack manually with a resizable array and a top-index counter. `Stack<T>` already handles this, including automatic growth and safe bounds checking.

### Coming from Java

Reaching for `java.util.Stack` out of habit — it's a legacy class in Java, internally extending `Vector` and carrying unwanted synchronization overhead, and Java's own docs recommend `Deque` instead. C#'s `Stack<T>` has no such legacy baggage — it's the idiomatic, current choice from the start.

---

## Performance Notes

- `Push`/`Pop`/`Peek` are O(1) amortized; occasional O(n) reallocation occurs on growth, same model as `List<T>` and `Queue<T>`.
- Being array-backed gives good cache locality for typical push/pop-heavy workloads.
- `ConcurrentStack<T>` uses lock-free algorithms internally and generally outperforms a manually `lock`-guarded `Stack<T>` under contention.

---

## Related Features

See also:
- List<T>
- Queue<T>
- Generics

---

## Best Practices

- Prefer `TryPop`/`TryPeek` in code paths where an empty stack is expected rather than exceptional.
- Use `ConcurrentStack<T>` for multi-threaded scenarios rather than hand-rolled locking.
- Pre-size (`new Stack<T>(capacity)`) when the approximate maximum depth is known.

---

## Common APIs

- `Stack<T>`
- `System.Collections.Concurrent.ConcurrentStack<T>`

---

## Notes

Enumerating a `Stack<T>` (e.g., via `foreach`) yields elements in LIFO order (top-to-bottom) — the opposite of `Queue<T>`'s front-to-back enumeration order.

---

## Official Documentation

- [Stack&lt;T&gt; class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.stack-1)
- [ConcurrentStack&lt;T&gt; class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentstack-1)
