# File I/O

Reading, writing, and managing files and directories via `System.IO`.

---

## Quick Summary

`System.IO` provides both simple static helpers (`File`, `Directory`) for common one-shot operations and stream-based abstractions (`FileStream`, `StreamReader`/`StreamWriter`) for fine-grained or large-scale I/O. Most modern APIs have both synchronous and `Async` counterparts, and the async versions should be preferred for I/O-bound code.

---

## Syntax

```csharp
// Simple whole-file read/write
string content = File.ReadAllText("data.txt");
File.WriteAllText("data.txt", "Hello, world!");

string[] lines = File.ReadAllLines("data.txt");
File.WriteAllLines("data.txt", new[] { "line1", "line2" });

// Async equivalents
string content2 = await File.ReadAllTextAsync("data.txt");
await File.WriteAllTextAsync("data.txt", "Hello, async world!");
```

---

## Syntax Variations

```csharp
// Stream-based reading for large files
using var reader = new StreamReader("large.txt");
string? line;
while ((line = await reader.ReadLineAsync()) is not null)
{
    Process(line);
}

// Stream-based writing
using var writer = new StreamWriter("output.txt", append: true);
await writer.WriteLineAsync("Appended line");

// Directory operations
Directory.CreateDirectory("logs");
foreach (var file in Directory.EnumerateFiles("logs", "*.log"))
{
    Console.WriteLine(file);
}

// File existence and metadata
bool exists = File.Exists("data.txt");
var info = new FileInfo("data.txt");
Console.WriteLine(info.Length);

// Path manipulation (cross-platform safe)
string combined = Path.Combine("folder", "subfolder", "file.txt");
string ext = Path.GetExtension("data.txt"); // ".txt"
```

---

## Examples

```csharp
// Reading a config file line by line
foreach (var line in File.ReadLines("config.txt"))
{
    if (line.StartsWith("#")) continue;
    Console.WriteLine(line);
}
```

```csharp
// Writing structured data to a file
var lines = orders.Select(o => $"{o.Id},{o.Total}");
await File.WriteAllLinesAsync("orders.csv", lines);
```

```csharp
// Realistic usage: safely copy and process a batch of files
foreach (var path in Directory.EnumerateFiles(sourceDir, "*.csv"))
{
    var destination = Path.Combine(destDir, Path.GetFileName(path));
    File.Copy(path, destination, overwrite: true);
}
```

```csharp
// Stream-based binary copy with progress-friendly buffering
using var source = File.OpenRead("input.bin");
using var destination = File.Create("output.bin");
await source.CopyToAsync(destination);
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Simple whole-file read/write | ⭐ `File.ReadAllText`/`WriteAllText` (sync and async) | ❌ Manual `fopen`/`fread`/`fwrite`/`fclose` | ⚠ `Files.readString`/`Files.writeString` (Java 11+) |
| Streaming large files | ⭐ `StreamReader`/`StreamWriter`/`FileStream` | ⚠ `FILE*` + manual buffering | ⚠ `BufferedReader`/`BufferedWriter` |
| Cross-platform path handling | ⭐ `Path.Combine` (handles `/` vs `\` automatically) | ❌ Manual string concatenation, platform-specific separators | ✅ `Path.of(...)` / `Paths.get(...)` (NIO.2) |
| Resource cleanup | ⭐ `using`/`await using` guarantees disposal | ❌ Manual `fclose`, easy to leak on early return | ✅ try-with-resources |
| Async file I/O | ⭐ Built-in `Async` suffix methods throughout | ❌ N/A (platform-specific, e.g., io_uring, manual) | ⚠ `AsynchronousFileChannel` (more verbose, callback/future-based) |

---

## Common Patterns

```csharp
// Ensure a directory exists before writing into it
Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
await File.WriteAllTextAsync(filePath, content);

// Safe temp file usage
string tempFile = Path.GetTempFileName();
try
{
    File.WriteAllText(tempFile, data);
    ProcessTempFile(tempFile);
}
finally
{
    File.Delete(tempFile);
}
```

---

## Common Mistakes

### Coming from C

Manually managing file handles and forgetting to close them on every exit path (including exceptions) — C#'s `using` statement guarantees disposal (closing the underlying handle) even when an exception is thrown, unlike manual `fclose` calls that are easy to miss on early returns.

```csharp
// Risk of leaking the handle if an exception occurs before Close()
var stream = File.OpenRead("data.txt");
ReadData(stream);
stream.Close(); // skipped if ReadData throws
```

Correct approach: always wrap disposable I/O resources in `using`.

```csharp
using var stream = File.OpenRead("data.txt");
ReadData(stream);
```

### Coming from Java

Using blocking synchronous file APIs (`File.ReadAllText`) inside `async` methods out of habit from `BufferedReader`, instead of using the `Async` counterparts that avoid blocking a thread-pool thread.

```csharp
// Blocks the thread inside an async method — defeats the purpose of async
async Task<string> LoadAsync()
{
    return File.ReadAllText("data.txt"); // synchronous, blocking call
}
```

Correct approach: use the async API.

```csharp
async Task<string> LoadAsync()
{
    return await File.ReadAllTextAsync("data.txt");
}
```

---

## Performance Notes

`File.ReadAllText`/`ReadAllLines` load the entire file into memory — fine for small/medium files, but avoid for very large files; use `StreamReader`/`File.ReadLines` (lazy enumeration) instead. Buffered stream wrappers (`BufferedStream`) or explicit buffer sizes reduce syscall overhead for many small reads/writes. Prefer `Directory.EnumerateFiles` over `Directory.GetFiles` when processing large directories, since `EnumerateFiles` streams results lazily instead of materializing the full array up front.

---

## Related Features

See also:

* Serialization
* Exceptions
* async / await

---

## Best Practices

* Prefer async file APIs (`ReadAllTextAsync`, etc.) in async code paths.
* Use `using`/`await using` for every `Stream`, `StreamReader`, or `StreamWriter`.
* Use `Path.Combine`/`Path.Join` instead of manual string concatenation for cross-platform correctness.
* Use `File.ReadLines`/`Directory.EnumerateFiles` (lazy) over `ReadAllLines`/`GetFiles` (eager) for large inputs.

---

## Common APIs

File

Directory

FileStream

StreamReader

StreamWriter

Path

FileInfo

---

## Notes

`File.ReadAllText` throws `FileNotFoundException`/`DirectoryNotFoundException` if the path doesn't exist — check `File.Exists` first only when the absence of a file is an expected, non-exceptional case; otherwise let the exception propagate.

---

## Official Documentation

* [File and stream I/O](https://learn.microsoft.com/en-us/dotnet/standard/io/)
* [File class](https://learn.microsoft.com/en-us/dotnet/api/system.io.file)
