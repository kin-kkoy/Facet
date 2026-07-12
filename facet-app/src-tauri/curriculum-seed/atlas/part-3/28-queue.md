# Queue&lt;T&gt;

The generic FIFO (first-in, first-out) collection.

---

## Quick Summary

`Queue<T>` is a first-in-first-out collection backed by a circular (ring) buffer array, giving O(1) amortized `Enqueue`/`Dequeue`. It's the direct analog of Java's `ArrayDeque` used as a queue (Java's legacy `Queue` interface is typically implemented by `LinkedList` or `ArrayDeque`). There's also a thread-safe variant, `ConcurrentQueue<T>`, for multi-threaded producer/consumer scenarios.

---

## Syntax

```csharp
Queue<int> queue = new Queue<int>();
queue.Enqueue(1);
queue.Enqueue(2);
int first = queue.Dequeue(); // 1
```

---

## Syntax Variations

```csharp
// Peek without removing
int next = queue.Peek();

// Try-based access (no exceptions on empty queue)
if (queue.TryDequeue(out int value))
    Console.WriteLine(value);

// Creating from an existing sequence (enqueues in iteration order)
var queue2 = new Queue<int>(new[] { 1, 2, 3 });

// Thread-safe variant
System.Collections.Concurrent.ConcurrentQueue<int> concurrentQueue = new();
concurrentQueue.Enqueue(1);
concurrentQueue.TryDequeue(out int result);
```

---

## Examples

```csharp
// Classic breadth-first traversal pattern using Queue<T>
Queue<TreeNode> toVisit = new Queue<TreeNode>();
toVisit.Enqueue(root);

while (toVisit.Count > 0)
{
    var node = toVisit.Dequeue();
    Process(node);
    foreach (var child in node.Children)
        toVisit.Enqueue(child);
}
```

```csharp
// Bounded producer/consumer style processing
Queue<string> jobs = new Queue<string>(new[] { "job1", "job2", "job3" });
while (jobs.Count > 0)
{
    var job = jobs.Dequeue();
    Console.WriteLine($"Processing {job}");
}
```

```csharp
// TryDequeue avoids exceptions when the queue might be empty
Queue<int> q = new();
if (!q.TryDequeue(out int val))
    Console.WriteLine("Queue was empty");
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Dedicated queue type | ⭐ `Queue<T>` | ❌ N/A (manual linked list/array implementation) | ⚠ Similar — `Queue<T>` interface, typically `ArrayDeque<T>` or `LinkedList<T>` |
| Underlying structure | Circular buffer array | N/A | ⚠ Similar — `ArrayDeque` also uses a resizable array |
| `Enqueue`/`Dequeue` naming | ⭐ Explicit method names | N/A | ❌ Different — Java uses `offer`/`poll`/`add`/`remove` |
| Exception-free dequeue | ⭐ `TryDequeue` | N/A | ⚠ Similar — `poll()` returns `null` instead of throwing |
| Thread-safe variant | ⭐ `ConcurrentQueue<T>` | ❌ N/A | ⚠ Similar — `ConcurrentLinkedQueue<T>` |

---

## Common Patterns

- Use `Queue<T>` for breadth-first search/traversal, task scheduling, and any producer/consumer buffering within a single thread.
- Use `TryDequeue`/`TryPeek` instead of `Dequeue`/`Peek` when the queue's emptiness is a normal, expected condition rather than a bug.
- Use `ConcurrentQueue<T>` (not a manually-locked `Queue<T>`) for multi-threaded producer/consumer scenarios.

---

## Common Mistakes

### Coming from C

Implementing a ring buffer manually with an array and head/tail indices. `Queue<T>` already provides this, tuned and tested, with automatic resizing.

### Coming from Java

Reaching for `LinkedList<T>` as a queue out of habit (a common Java pattern via the `Queue` interface). In C#, `Queue<T>` is the dedicated, array-backed type — it's typically more cache-friendly than a doubly-linked list for this purpose, and `LinkedList<T>` in C# is a separate, less commonly used type.

---

## Performance Notes

- `Enqueue`/`Dequeue` are O(1) amortized; occasional O(n) reallocation happens when the internal buffer needs to grow.
- Being array-backed, `Queue<T>` has better cache locality than a linked-list-based queue for typical workloads.
- `ConcurrentQueue<T>` avoids full-lock contention using lock-free algorithms internally, generally outperforming a manually `lock`-guarded `Queue<T>` under contention.

---

## Related Features

See also:
- List<T>
- Stack<T>
- Generics

---

## Best Practices

- Prefer `TryDequeue`/`TryPeek` in code paths where an empty queue is a normal state, not an error.
- Use `ConcurrentQueue<T>` rather than hand-rolled locking around `Queue<T>` for multi-threaded scenarios.
- Pre-size (`new Queue<T>(capacity)`) when the approximate maximum size is known.

---

## Common APIs

- `Queue<T>`
- `System.Collections.Concurrent.ConcurrentQueue<T>`

---

## Notes

`Queue<T>` implements `IEnumerable<T>` for read-only iteration (front-to-back order), but iterating does not dequeue — use `Dequeue`/`TryDequeue` explicitly to consume elements.

---

## Official Documentation

- [Queue&lt;T&gt; class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.queue-1)
- [ConcurrentQueue&lt;T&gt; class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentqueue-1)
