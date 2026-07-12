# async / await

Compiler-driven syntax for writing asynchronous code in a synchronous-looking style.

---

## Quick Summary

The `async` modifier marks a method as containing asynchronous logic, enabling the use of `await` inside it. `await` suspends execution of the method until the awaited `Task`/`Task<T>`/`ValueTask<T>` completes, without blocking the calling thread. The compiler transforms an `async` method into a state machine behind the scenes — no threads are created by `async`/`await` themselves.

---

## Syntax

```csharp
async Task<string> FetchDataAsync()
{
    using var client = new HttpClient();
    string result = await client.GetStringAsync("https://example.com");
    return result;
}

// Calling it
string data = await FetchDataAsync();
```

---

## Syntax Variations

```csharp
// async Task (no return value)
async Task SaveAsync(string data)
{
    await File.WriteAllTextAsync("data.txt", data);
}

// async void — only for event handlers, avoid elsewhere
async void Button_Click(object sender, EventArgs e)
{
    await DoWorkAsync();
}

// async with ValueTask<T> to reduce allocations
async ValueTask<int> GetCachedOrComputeAsync()
{
    if (_cache is not null) return _cache.Value;
    return await ComputeAsync();
}

// Top-level await in Main (C# 7.1+ async Main)
static async Task Main(string[] args)
{
    await RunAsync();
}

// ConfigureAwait(false) to avoid capturing the synchronization context
await SomeAsyncCall().ConfigureAwait(false);
```

---

## Examples

```csharp
async Task<int> SumFilesAsync(string[] paths)
{
    int total = 0;
    foreach (var path in paths)
    {
        string content = await File.ReadAllTextAsync(path);
        total += int.Parse(content);
    }
    return total;
}
```

```csharp
// Exception handling with async/await
async Task<string> SafeFetchAsync(string url)
{
    try
    {
        using var client = new HttpClient();
        return await client.GetStringAsync(url);
    }
    catch (HttpRequestException ex)
    {
        return $"Error: {ex.Message}";
    }
}
```

```csharp
// Realistic usage: layered async service methods
public class OrderService
{
    private readonly HttpClient _client;

    public OrderService(HttpClient client) => _client = client;

    public async Task<Order> GetOrderAsync(int id)
    {
        var response = await _client.GetAsync($"/orders/{id}");
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<Order>(json)!;
    }
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Async syntax | ⭐ `async`/`await` keywords with compiler-generated state machine | ❌ N/A — callbacks or platform-specific APIs (epoll, libuv) | ⚠ No native equivalent; `CompletableFuture.thenApply`/virtual threads (Java 21+) approximate it |
| Blocking behavior | ✅ `await` never blocks the calling thread | ❌ N/A | ⚠ Virtual threads (Project Loom) avoid blocking OS threads, but syntax remains callback/chain-based, not linear |
| Exception propagation | ⭐ Naturally flows via `try`/`catch` around `await`, same as sync code | ❌ N/A | ⚠ `CompletableFuture` exceptions require `.exceptionally()`/`.handle()`, less linear |
| Readability of sequential async logic | ⭐ Reads like synchronous code top-to-bottom | ❌ N/A | ⚠ Chained `.thenApply().thenCompose()` calls read less linearly |

---

## Common Patterns

```csharp
// Sequential awaits when operations depend on each other
var user = await GetUserAsync(id);
var orders = await GetOrdersAsync(user.Id);

// Concurrent awaits when operations are independent
var userTask = GetUserAsync(id);
var configTask = GetConfigAsync();
await Task.WhenAll(userTask, configTask);

// Library code should use ConfigureAwait(false)
public async Task<string> LibraryMethodAsync()
{
    return await httpClient.GetStringAsync(url).ConfigureAwait(false);
}
```

---

## Common Mistakes

### Coming from C

Assuming `async` methods run on a separate thread by default (like spawning a pthread), and being confused when profiling shows the continuation running on the same or a different thread-pool thread depending on context — `async`/`await` is about non-blocking suspension, not threading.

```csharp
// Misconception: this does NOT create a background thread by itself
async Task DoWorkAsync()
{
    await SomeIoBoundCallAsync(); // just suspends, doesn't spawn a thread
}
```

Correct approach: understand that `await` frees the current thread while waiting, and only `Task.Run` explicitly queues work to another thread for CPU-bound work.

### Coming from Java

Sequentially `await`-ing independent operations one after another out of habit (mirroring blocking `future.get()` chains), missing the opportunity to run them concurrently with `Task.WhenAll`.

```csharp
// Unnecessarily sequential — each await waits before starting the next
var a = await FetchAAsync();
var b = await FetchBAsync();
```

Correct approach: start both first, then await together, if they don't depend on each other.

```csharp
var taskA = FetchAAsync();
var taskB = FetchBAsync();
var (a, b) = (await taskA, await taskB);
```

---

## Performance Notes

Each `await` on a not-yet-completed task involves capturing continuation state (a heap allocation for the state machine in most cases, though the JIT can sometimes avoid it for simple synchronous-completion paths). `ConfigureAwait(false)` skips capturing the `SynchronizationContext`/`TaskScheduler`, avoiding a context-switch back to, e.g., a UI thread — recommended in library code that doesn't need to resume on the original context. Excess `async` layering with no real asynchronous work adds state-machine overhead for no benefit.

---

## Related Features

See also:

* Tasks
* Cancellation
* Parallelism

---

## Best Practices

* Name async methods with an `Async` suffix (`GetDataAsync`).
* Never use `async void` except for event handlers — exceptions in `async void` methods cannot be caught by the caller.
* Use `ConfigureAwait(false)` in library/non-UI code to avoid unnecessary context capturing.
* Prefer `Task.WhenAll` over sequential awaits for independent operations.
* Propagate `CancellationToken` parameters through async call chains.

---

## Common APIs

Task

Task\<TResult\>

HttpClient

CancellationToken

ConfigureAwait

---

## Notes

`async Task Main` has been supported since C# 7.1, allowing the application entry point itself to be asynchronous without manual `.Wait()`/`.Result` blocking hacks.

---

## Official Documentation

* [Asynchronous programming with async and await](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/)
* [ConfigureAwait FAQ](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/asyncawait)
