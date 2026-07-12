# Cancellation

Cooperative cancellation of asynchronous and long-running operations via `CancellationToken`.

---

## Quick Summary

.NET uses a cooperative cancellation model built around `CancellationTokenSource` and `CancellationToken`. A token is passed into async methods, which periodically check it (or pass it further into APIs that check it internally) and throw `OperationCanceledException` when cancellation is requested. There is no forceful thread termination — the running code must observe and respond to the token.

---

## Syntax

```csharp
var cts = new CancellationTokenSource();
CancellationToken token = cts.Token;

async Task RunAsync(CancellationToken token)
{
    for (int i = 0; i < 10; i++)
    {
        token.ThrowIfCancellationRequested();
        await Task.Delay(500, token);
        Console.WriteLine(i);
    }
}

// Trigger cancellation
cts.Cancel();
```

---

## Syntax Variations

```csharp
// Cancel after a timeout
var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

// Manually cancel after a delay
cts.CancelAfter(TimeSpan.FromSeconds(5));

// Linked token sources (cancel if either parent cancels)
var linked = CancellationTokenSource.CreateLinkedTokenSource(tokenA, tokenB);

// Registering a callback for cancellation
token.Register(() => Console.WriteLine("Cancelled!"));

// Checking without throwing
if (token.IsCancellationRequested) { /* clean up */ }

// Passing CancellationToken.None when cancellation isn't needed
await SomeAsync(CancellationToken.None);
```

---

## Examples

```csharp
async Task<string> DownloadWithTimeoutAsync(string url)
{
    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
    using var client = new HttpClient();
    return await client.GetStringAsync(url, cts.Token);
}
```

```csharp
// Handling OperationCanceledException
async Task RunSafelyAsync(CancellationToken token)
{
    try
    {
        await Task.Delay(5000, token);
        Console.WriteLine("Completed");
    }
    catch (OperationCanceledException)
    {
        Console.WriteLine("Operation was cancelled");
    }
}
```

```csharp
// Realistic usage: ASP.NET Core action method honoring request abort
[HttpGet]
public async Task<IActionResult> GetReport(CancellationToken cancellationToken)
{
    var data = await _reportService.GenerateAsync(cancellationToken);
    return Ok(data);
}
```

```csharp
// User-triggered cancel button (e.g., in a UI app)
private CancellationTokenSource? _cts;

async void OnStartClicked()
{
    _cts = new CancellationTokenSource();
    try
    {
        await LongRunningOperationAsync(_cts.Token);
    }
    catch (OperationCanceledException) { }
}

void OnCancelClicked() => _cts?.Cancel();
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Cancellation model | ⭐ Cooperative via `CancellationToken` passed through call chains | ❌ N/A — manual flags/`pthread_cancel` (unsafe, discouraged) | ⚠ `Future.cancel()` (limited; doesn't propagate cleanly through chained futures) / `Thread.interrupt()` |
| Propagation through async chains | ⭐ Token threaded explicitly through method signatures | ❌ N/A | ⚠ No standard equivalent; interruption model is coarser |
| Timeout-based cancellation | ⭐ `CancellationTokenSource(TimeSpan)` / `CancelAfter` | ❌ Manual timers | ⚠ Manual `ScheduledExecutorService` + `Future.cancel()` |
| Linking multiple cancellation sources | ⭐ `CreateLinkedTokenSource` | ❌ N/A | ❌ No direct equivalent |

---

## Common Patterns

```csharp
// Standard method signature accepting cancellation
public async Task<Data> LoadAsync(CancellationToken cancellationToken = default)
{
    return await _repository.GetAsync(cancellationToken);
}

// Combining a timeout with an external token
var linked = CancellationTokenSource.CreateLinkedTokenSource(
    externalToken, new CancellationTokenSource(TimeSpan.FromSeconds(30)).Token);
```

---

## Common Mistakes

### Coming from C

Expecting cancellation to forcibly terminate a running thread the way `pthread_cancel` (unsafely) can, and being surprised that cancellation in .NET is purely cooperative — code that never checks the token will simply keep running.

```csharp
// This will NOT stop the loop if the body never checks the token
async Task RunAsync(CancellationToken token)
{
    while (true)
    {
        DoWork(); // token never checked — runs forever regardless of cancellation
    }
}
```

Correct approach: check the token (or pass it into an API that does) inside any loop or long-running operation.

```csharp
async Task RunAsync(CancellationToken token)
{
    while (!token.IsCancellationRequested)
    {
        DoWork();
    }
}
```

### Coming from Java

Treating `CancellationToken` like `Future.cancel()` — expecting to call a method on the running task itself to stop it, rather than realizing the token must be created up front and threaded through as a parameter before the operation starts.

```csharp
// There's no "task.Cancel()" — cancellation happens via the token, not the Task object
Task t = RunAsync(CancellationToken.None);
t.Cancel(); // does not exist
```

Correct approach: create the source first, pass its token in, and cancel the source.

```csharp
var cts = new CancellationTokenSource();
Task t = RunAsync(cts.Token);
cts.Cancel();
```

---

## Performance Notes

Checking `token.IsCancellationRequested` is a cheap volatile read; `ThrowIfCancellationRequested()` adds negligible overhead unless actually triggered, in which case it throws an exception (which is comparatively expensive) — avoid calling it in extremely tight inner loops where a periodic check (e.g., every N iterations) is more appropriate. Registering many callbacks via `token.Register` has memory overhead per registration; dispose registrations (`IDisposable`) when no longer needed.

---

## Related Features

See also:

* Tasks
* async / await
* Parallelism

---

## Best Practices

* Accept a `CancellationToken` parameter (defaulting to `default`) in any public async API that may run for a nontrivial duration.
* Propagate the token to every downstream async call, including `Task.Delay`, HTTP calls, and database queries.
* Don't swallow `OperationCanceledException` silently in library code — let it propagate unless you're at a boundary that should handle it.
* Use `CancelAfter`/timeout constructors instead of manual `Task.Delay` races when you just need a deadline.

---

## Common APIs

CancellationToken

CancellationTokenSource

OperationCanceledException

TaskCanceledException

---

## Notes

`TaskCanceledException` derives from `OperationCanceledException`, so catching the base type covers both; `Task.Delay(ms, token)` and most I/O APIs throw `TaskCanceledException` specifically when their token fires.

---

## Official Documentation

* [Cancellation in managed threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads)
* [CancellationToken struct](https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtoken)
