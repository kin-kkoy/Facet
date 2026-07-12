# Parallelism

CPU-bound multi-core execution via the Task Parallel Library (TPL) and PLINQ.

---

## Quick Summary

Parallelism in .NET is distinct from asynchrony: it's about executing CPU-bound work concurrently across multiple cores, rather than efficiently waiting on I/O. The Task Parallel Library provides `Parallel.For`/`Parallel.ForEach`/`Parallel.Invoke` for data/task parallelism, and PLINQ (`.AsParallel()`) parallelizes LINQ query execution. Both are built on top of the thread pool and `Task`.

---

## Syntax

```csharp
// Parallel.For
Parallel.For(0, 100, i =>
{
    Console.WriteLine(i);
});

// Parallel.ForEach
Parallel.ForEach(items, item =>
{
    Process(item);
});

// Parallel.Invoke — run independent actions concurrently
Parallel.Invoke(
    () => TaskA(),
    () => TaskB(),
    () => TaskC()
);
```

---

## Syntax Variations

```csharp
// PLINQ
var results = data.AsParallel().Where(x => IsPrime(x)).ToList();

// PLINQ preserving order
var ordered = data.AsParallel().AsOrdered().Select(Transform).ToList();

// Parallel with options (limit degree of parallelism)
var options = new ParallelOptions { MaxDegreeOfParallelism = 4 };
Parallel.ForEach(items, options, item => Process(item));

// Parallel.ForEachAsync (C# 10+, .NET 6+) — parallel + async together
await Parallel.ForEachAsync(urls, async (url, token) =>
{
    await DownloadAsync(url, token);
});

// Cancellation with Parallel loops
var cts = new CancellationTokenSource();
var po = new ParallelOptions { CancellationToken = cts.Token };
Parallel.ForEach(items, po, item => Process(item));
```

---

## Examples

```csharp
// CPU-bound image processing across all images in parallel
Parallel.ForEach(imagePaths, path =>
{
    var image = LoadImage(path);
    ApplyFilter(image);
    SaveImage(image, path);
});
```

```csharp
// PLINQ for a CPU-bound computation over a large dataset
var primes = Enumerable.Range(2, 1_000_000)
    .AsParallel()
    .Where(IsPrime)
    .ToList();
```

```csharp
// Realistic usage: parallel + async I/O with controlled concurrency
await Parallel.ForEachAsync(
    urls,
    new ParallelOptions { MaxDegreeOfParallelism = 8 },
    async (url, token) =>
    {
        var content = await httpClient.GetStringAsync(url, token);
        await ProcessContentAsync(content);
    });
```

```csharp
// Aggregating results safely with thread-local accumulation
long total = 0;
Parallel.For(0, data.Length,
    () => 0L,                                     // thread-local seed
    (i, state, localSum) => localSum + data[i],     // body
    localSum => Interlocked.Add(ref total, localSum) // final accumulation
);
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Data parallelism over a range/collection | ⭐ `Parallel.For`/`Parallel.ForEach` | ⚠ OpenMP (`#pragma omp parallel for`) — external, non-standard C | ⚠ `parallelStream()` on collections |
| Parallel LINQ queries | ⭐ PLINQ (`.AsParallel()`) | ❌ N/A | ⚠ `stream().parallel()` |
| Combining parallelism with async I/O | ⭐ `Parallel.ForEachAsync` (.NET 6+) | ❌ N/A | ❌ No direct equivalent; manual `ExecutorService` + `CompletableFuture` composition |
| Degree-of-parallelism control | ⭐ `ParallelOptions.MaxDegreeOfParallelism` | ⚠ `omp_set_num_threads` | ⚠ `ForkJoinPool` custom pool sizing (more manual) |

---

## Common Patterns

```csharp
// Bounding parallelism to avoid oversubscription
var options = new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount };
Parallel.ForEach(items, options, Process);

// Combining PLINQ with ordering when sequence matters
var ranked = scores.AsParallel().AsOrdered().OrderByDescending(s => s.Value).ToList();
```

---

## Common Mistakes

### Coming from C

Manually spinning up raw threads (`Thread` or POSIX-style patterns) for embarrassingly parallel loops instead of using `Parallel.For`/`Parallel.ForEach`, which handle partitioning and thread-pool scheduling automatically.

```csharp
// Manual thread-per-chunk management — error-prone, hard to tune
var threads = new List<Thread>();
foreach (var chunk in Partition(data))
{
    var t = new Thread(() => ProcessChunk(chunk));
    t.Start();
    threads.Add(t);
}
foreach (var t in threads) t.Join();
```

Correct approach: let `Parallel.ForEach` manage partitioning and thread-pool usage.

```csharp
Parallel.ForEach(data, ProcessItem);
```

### Coming from Java

Reaching for `Parallel.ForEach` on I/O-bound work (network/database calls) the way one might use a parallel stream for blocking calls, without realizing this ties up thread-pool threads unnecessarily — `Parallel.ForEachAsync` or plain `Task.WhenAll` is more appropriate for I/O-bound concurrency.

```csharp
// Blocks thread-pool threads on I/O — poor scalability
Parallel.ForEach(urls, url =>
{
    var content = httpClient.GetStringAsync(url).Result; // blocking call inside parallel loop
});
```

Correct approach: use `Parallel.ForEachAsync` or `Task.WhenAll` for I/O-bound concurrency instead.

```csharp
await Parallel.ForEachAsync(urls, async (url, token) =>
{
    var content = await httpClient.GetStringAsync(url, token);
});
```

---

## Performance Notes

`Parallel.For`/`ForEach` partition work across available cores and have overhead proportional to partitioning strategy and delegate invocation — best suited for CPU-bound work with enough iterations to amortize that overhead; trivial loop bodies may run slower in parallel than sequential due to coordination cost. PLINQ can sometimes be slower than sequential LINQ for small or already-fast queries due to partitioning/merging overhead — measure before adopting. Always bound `MaxDegreeOfParallelism` when running alongside other thread-pool consumers (e.g., an ASP.NET Core server handling requests) to avoid starving the pool.

---

## Related Features

See also:

* Tasks
* async / await
* Cancellation

---

## Best Practices

* Use `Parallel`/PLINQ for CPU-bound work; use `Task.WhenAll`/`Parallel.ForEachAsync` for I/O-bound work.
* Set `MaxDegreeOfParallelism` explicitly in server/shared-pool contexts.
* Avoid shared mutable state inside parallel bodies without synchronization (`Interlocked`, `lock`, or thread-local accumulation).
* Benchmark before parallelizing — not all workloads benefit, and small collections often run faster sequentially.

---

## Common APIs

Parallel

ParallelOptions

ParallelQuery\<T\>

Interlocked

Environment.ProcessorCount

---

## Notes

PLINQ does not guarantee order by default (for performance); use `.AsOrdered()` explicitly when output order must match input order, at some throughput cost.

---

## Official Documentation

* [Task Parallel Library (TPL)](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-parallel-library-tpl)
* [Parallel LINQ (PLINQ)](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/introduction-to-plinq)
