# Tasks

The core abstraction for representing asynchronous and concurrent operations.

---

## Quick Summary

`Task` and `Task<TResult>` represent an asynchronous operation that may still be running, may have completed, or may have faulted. They are the unit of composition for `async`/`await`, the Task Parallel Library (TPL), and most modern .NET concurrency APIs. A `Task` is not automatically a thread — many tasks run without ever occupying a dedicated thread, especially I/O-bound ones scheduled via the thread pool's async machinery.

---

## Syntax

```csharp
// Task with no return value
Task task = Task.Run(() => Console.WriteLine("Running"));

// Task<TResult> with a return value
Task<int> task2 = Task.Run(() => 42);

// Awaiting a task
int result = await task2;

// Completed/faulted task helpers
Task completed = Task.CompletedTask;
Task<int> fromResult = Task.FromResult(42);
Task faulted = Task.FromException(new InvalidOperationException());
```

---

## Syntax Variations

```csharp
// Task.Delay for async waiting (non-blocking)
await Task.Delay(1000);

// Task.WhenAll — wait for multiple tasks to complete
await Task.WhenAll(task1, task2, task3);

// Task.WhenAny — wait for the first to complete
Task first = await Task.WhenAny(task1, task2);

// Task.Run vs directly calling an async method
Task<int> t1 = Task.Run(() => ComputeSync());     // offloads CPU-bound work to thread pool
Task<int> t2 = ComputeAsync();                     // calls an already-async method directly

// Continuation (rarely needed with async/await available)
task.ContinueWith(t => Console.WriteLine(t.Result));
```

---

## Examples

```csharp
static Task<int> ComputeAsync()
{
    return Task.Run(() =>
    {
        int sum = 0;
        for (int i = 0; i < 1000; i++) sum += i;
        return sum;
    });
}

int total = await ComputeAsync();
```

```csharp
// Running multiple independent tasks concurrently
Task<string> t1 = DownloadAsync("https://example.com/a");
Task<string> t2 = DownloadAsync("https://example.com/b");

string[] results = await Task.WhenAll(t1, t2);
```

```csharp
// Handling faults
Task<int> risky = Task.Run(() => throw new InvalidOperationException("Boom"));

try
{
    await risky;
}
catch (InvalidOperationException ex)
{
    Console.WriteLine($"Caught: {ex.Message}");
}
```

```csharp
// Realistic usage: fire off parallel independent I/O calls and aggregate
static async Task<decimal> GetTotalPortfolioValueAsync(IEnumerable<string> symbols)
{
    var priceTasks = symbols.Select(s => FetchPriceAsync(s));
    decimal[] prices = await Task.WhenAll(priceTasks);
    return prices.Sum();
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Async operation abstraction | ⭐ `Task` / `Task<TResult>` | ❌ N/A — manual threads or platform-specific async APIs | ⚠ `CompletableFuture<T>` / `Future<T>` |
| Composability (`WhenAll`, `WhenAny`) | ⭐ Built-in static combinators | ❌ N/A | ⚠ `CompletableFuture.allOf`/`anyOf` (less ergonomic, returns `Void`) |
| Requires a dedicated thread | ⭐ No — often scheduled on thread pool without blocking a thread | ⚠ POSIX threads always occupy an OS thread | ⚠ `Future` from `ExecutorService` typically ties to a thread; `CompletableFuture` can be async |
| Result retrieval | ⭐ `await task` or `task.Result` (blocking, discouraged) | ❌ N/A | ⚠ `future.get()` (blocking) |

---

## Common Patterns

```csharp
// Offload CPU-bound work from a UI/request thread
var result = await Task.Run(() => ExpensiveComputation());

// Fan-out / fan-in
var tasks = ids.Select(id => FetchByIdAsync(id));
var all = await Task.WhenAll(tasks);

// Timeout via WhenAny + Delay
var completed = await Task.WhenAny(longRunningTask, Task.Delay(5000));
if (completed == longRunningTask) { /* success */ }
else { /* timed out */ }
```

---

## Common Mistakes

### Coming from C

Assuming a `Task` always maps 1:1 to an OS thread, and creating a `Task.Run` per I/O operation as if it were `pthread_create`, wasting thread-pool capacity on work that should just be awaited directly.

```csharp
// Wasteful — blocks a thread-pool thread on I/O unnecessarily
Task<string> t = Task.Run(() => new HttpClient().GetStringAsync(url).Result);
```

Correct approach: call the async I/O method directly without wrapping in `Task.Run`.

```csharp
Task<string> t = new HttpClient().GetStringAsync(url);
```

### Coming from Java

Calling `.Result` or `.Wait()` on a task synchronously (mirroring `future.get()`), which can cause deadlocks in contexts with a synchronization context (e.g., older ASP.NET, WPF/WinForms UI threads) and always blocks a thread unnecessarily.

```csharp
// Risk of deadlock in UI/ASP.NET classic contexts; blocks a thread pointlessly
int result = ComputeAsync().Result;
```

Correct approach: use `await` all the way up the call stack.

```csharp
int result = await ComputeAsync();
```

---

## Performance Notes

`Task.Run` queues work to the thread pool — appropriate for CPU-bound work, wasteful for I/O-bound work that already has a non-blocking async API. Awaiting a task that's already completed synchronously (e.g., cached results) has minimal overhead due to compiler optimizations around `ValueTask` and synchronous completion paths. Excessive `Task.WhenAll` over huge collections can exhaust thread-pool threads if the delegate itself is synchronous/blocking rather than truly async.

---

## Related Features

See also:

* async / await
* Cancellation
* Parallelism

---

## Best Practices

* Use `Task.Run` only for CPU-bound work; call async I/O APIs directly.
* Prefer `Task.WhenAll`/`Task.WhenAny` over manual polling or `ContinueWith` chains.
* Avoid `.Result`/`.Wait()` — always `await`.
* Return `Task`/`Task<T>` from async methods; avoid `async void` except for event handlers.

---

## Common APIs

Task

Task\<TResult\>

Task.Run

Task.WhenAll

Task.WhenAny

Task.Delay

---

## Notes

`ValueTask<T>` is a struct-based alternative to `Task<T>` used to avoid allocations in hot paths where the result is frequently available synchronously — it comes with stricter usage rules (e.g., cannot be awaited twice).

---

## Official Documentation

* [Task-based Asynchronous Pattern (TAP)](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/task-asynchronous-programming-model)
* [Task class](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task)
