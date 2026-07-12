# Async / Await

Modern .NET does I/O — web requests, database calls, file reads — **asynchronously**, so a program
waits for slow things without blocking a thread. This is new relative to your console toys, so
we'll build the mental model carefully. It's the last piece of the C# "spine," and every web/API/
cloud job assumes you have it.

---

## 1. The mental model

A **synchronous** call *blocks*: the thread stands still until the work finishes. An **asynchronous**
call *yields*: "start this, free my thread to do other things, wake me when it's done." The keyword
is **`await`** — it pauses *your method* there and returns the thread to the pool, then resumes your
method where it left off once the result is ready.

- **`Task`** — a promise of "work that will finish" (like a Java `Future`/`CompletableFuture`).
  `Task<T>` promises a value of `T`; plain `Task` promises just completion.
- **`async`** — marks a method that may `await`. It changes the return type: an `async` method
  returns `Task` / `Task<T>`, not the bare value.
- **`await`** — unwrap a `Task`: pause until it's done, then continue with the result.

```csharp
using System.Threading.Tasks;

async Task<string> FetchGreetingAsync()
{
    await Task.Delay(500);      // simulate slow I/O; the thread is FREED for 500ms
    return "hello";
}

// caller (also async):
string g = await FetchGreetingAsync();
System.Console.WriteLine(g);
```

Read an async body top-to-bottom like normal code, but treat each `await` as a "pause here, resume
later" marker. **Contrast with Java:** conceptually like `CompletableFuture`, but `await` reads like
straight-line code instead of `.thenApply(...)` chains — that's the whole ergonomic win.

> **Try it (lab):** write `async Task<int> SlowDoubleAsync(int n)` that `await Task.Delay(300)` then
> returns `n*2`. Call it, `await` it, print the result. Add a `Console.WriteLine` before and after
> the `await` and watch the ordering.

*(Atlas: **Tasks**, **async / await**.)*

---

## 2. "Async all the way"

The one structural rule: **if a method awaits, it must be `async` and return a `Task`, and its
callers should `await` it too** — all the way up to the entry point (`async Task Main`, or an
ASP.NET request handler). Do **not** bridge async to sync by calling `.Result` or `.Wait()` on a
`Task` — that's the classic **deadlock** and the #1 async bug. If you're awaiting, everyone above
you awaits.

```csharp
// GOOD:
async Task<int> GetCountAsync() => (await LoadAsync()).Count;

// BAD — can deadlock, and blocks a thread the whole time:
int count = LoadAsync().Result;
```

---

## 3. Doing things concurrently

`await`-ing one call then the next is still *sequential*. To run independent work at the same time,
**start the tasks, then await them together:**

```csharp
using System.Threading.Tasks;

Task<int> a = SlowDoubleAsync(1);   // both start now...
Task<int> b = SlowDoubleAsync(2);
int[] results = await Task.WhenAll(a, b);   // ...and we wait for both concurrently

// vs the slow way (each waits for the previous):
int x = await SlowDoubleAsync(1);
int y = await SlowDoubleAsync(2);   // starts only after x finished
```

`Task.WhenAll` waits for all; `Task.WhenAny` for the first to finish (e.g. "fastest mirror wins").
For CPU-bound work there's `Parallel.ForEach` / PLINQ — but reach for those only when the work is
genuinely compute-heavy; most server code is **I/O-bound** and just wants `WhenAll`.

**Use-case:** a page that needs the user, their orders, and their recommendations — three
independent I/O calls. `WhenAll` runs them together (≈ the slowest one) instead of summing all three
latencies.

> **Try it (lab):** call `SlowDoubleAsync` three times sequentially (await each) and time it (~900ms),
> then start all three and `await Task.WhenAll` (~300ms). Feel the difference concurrency makes.

*(Atlas: **Parallelism**.)*

---

## 4. Cancellation

Long-running or user-triggered work should be cancellable. The convention is a
**`CancellationToken`** threaded through the call chain; the caller can signal "stop," and awaited
operations throw `OperationCanceledException`:

```csharp
using System.Threading;
using System.Threading.Tasks;

async Task WorkAsync(CancellationToken ct)
{
    for (int i = 0; i < 100; i++)
    {
        ct.ThrowIfCancellationRequested();   // bail out cooperatively
        await Task.Delay(100, ct);           // most async APIs accept the token
    }
}

using var cts = new CancellationTokenSource(millisecondsDelay: 1000);   // auto-cancel after 1s
try { await WorkAsync(cts.Token); }
catch (OperationCanceledException) { System.Console.WriteLine("cancelled"); }
```

Pass the token to every async call that takes one — that's how a cancelled web request actually
stops doing work instead of finishing pointlessly. **Use-case:** a "Cancel" button, a request
timeout, or shutting a service down cleanly.

> **Try it (lab):** run `WorkAsync` with a token from a `CancellationTokenSource(500)` and confirm it
> stops around iteration 5 with `OperationCanceledException` — not at 100.

*(Atlas: **Cancellation**.)*

---

## 5. Gotchas (the ones that actually happen)

- **`async void`** — never write it except for event handlers. Its exceptions can't be caught by the
  caller and will crash the process. Return `Task` instead.
- **`.Result` / `.Wait()`** — blocking on a task from a context that also needs that thread
  deadlocks. Just `await`.
- **Forgetting to `await`** — calling an async method without `await` starts it and *ignores* the
  result and any exception (fire-and-forget by accident). The compiler warns; heed it.
- **Exceptions surface at the `await`,** not when you start the task — so wrap the `await` in
  `try/catch`, not the call that creates the task.
- **Async ≠ threads-for-free.** It's about *not blocking on I/O*. It won't speed up a tight CPU loop
  — that's what parallelism is for. Making a pure-CPU method `async` just adds overhead.

## Performance notes

- **Don't `await` sequentially when calls are independent** — that's the most common perf mistake;
  use `WhenAll`.
- **`ValueTask` / `ValueTask<T>`** exist for hot paths that often complete synchronously (avoids a
  `Task` allocation) — reach for them only when a profiler flags allocations; `Task` is the default.
- **`ConfigureAwait(false)`** in library code avoids capturing a sync context (a small win / a
  deadlock-avoidance in some hosts). In app code you usually don't need it.

## Build it (make the chapter real)

Write a small tool that:

1. Fetches (or fake-`Task.Delay`s) **three "sources" concurrently** with `Task.WhenAll`, and prints
   each as it would complete.
2. Accepts a `CancellationToken` you trip after 1 second to prove it stops cleanly.
3. Handles a source that throws — catch it at the `await` and keep the others.

For the lesson that sticks: deliberately write the `.Result` deadlock once, watch it hang, then fix
it by `await`-ing. You'll never write it again.
