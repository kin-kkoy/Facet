# Appendix F — Recommended Practices

A consolidated list of modern C#/.NET best practices referenced throughout the atlas.

---

## Quick Summary

This appendix gathers the "Best Practices" guidance scattered across individual pages into one master checklist, organized by area — useful as a final review pass on a codebase or a quick onboarding reference for developers new to modern, idiomatic C#.

---

## Language & Style

* Enable `<Nullable>enable</Nullable>` on every new project; treat nullable warnings as errors in CI where practical.
* Use expression-bodied members for simple, single-expression computed properties and pass-through methods — don't force complex logic into them.
* Prefer pattern matching (`is`, `switch` expressions, property patterns) over chained `if`/`else` type checks.
* Use `record` types for immutable data models that need value equality; use `class` for entities with identity and mutable behavior.
* Follow PascalCase for public members/types, camelCase (often prefixed `_`) for private fields.

---

## Collections & LINQ

* Accept the least specific interface a method needs (`IEnumerable<T>`); return the most specific type useful to the caller.
* Materialize (`.ToList()`) LINQ queries that will be enumerated more than once.
* Use `.Any()` instead of `.Count() > 0` for existence checks.
* Prefer generic collections (`List<T>`, `Dictionary<TKey,TValue>`) over non-generic ones (`ArrayList`, `Hashtable`) to avoid boxing.

---

## Async & Concurrency

* Suffix async methods with `Async` (`GetDataAsync`).
* Never use `async void` except for event handlers.
* Use `Task.Run` only for CPU-bound work; call async I/O APIs directly.
* Always propagate `CancellationToken` through async call chains in long-running operations.
* Use `ConfigureAwait(false)` in library/non-UI code.
* Use `Parallel`/PLINQ for CPU-bound parallelism; use `Task.WhenAll`/`Parallel.ForEachAsync` for I/O-bound concurrency.

---

## Error Handling

* Catch specific exception types rather than bare `catch (Exception)` where possible.
* Don't use exceptions for ordinary control flow — reserve them for truly exceptional conditions.
* Include an `Exception` argument in `LogError`/`LogCritical` calls to preserve the stack trace.

---

## Project & Ecosystem

* Use SDK-style `.csproj` files (default for all modern templates); avoid legacy verbose project XML.
* Centralize shared build settings in `Directory.Build.props`; centralize package versions in `Directory.Packages.props`.
* Pin exact NuGet package versions in production; avoid floating versions (`4.*`) outside fast-moving internal tooling.
* Use lock files (`packages.lock.json`) in CI for reproducible restores.

---

## Configuration & DI

* Use the Options pattern (`IOptions<T>`/`IOptionsMonitor<T>`) instead of scattering raw `IConfiguration` key lookups through business logic.
* Keep secrets out of `appsettings.json` — use user secrets locally, a secret manager in production.
* Depend on interfaces/abstractions in constructors, not concrete types.
* Match DI lifetimes carefully — never inject a `Scoped` service into a `Singleton`.

---

## Logging & Serialization

* Use message templates with named placeholders (`{OrderId}`) in log calls — never string interpolation, to preserve structured data.
* Inject `ILogger<T>` via constructor rather than constructing loggers manually.
* Default to `System.Text.Json` for new projects; reach for Newtonsoft.Json only when its specific extra features are needed.
* Use source-generated JSON contexts (`JsonSerializerContext`) for AOT/trimming or high-throughput scenarios.

---

## File & Resource Management

* Wrap every `Stream`, `StreamReader`, or `StreamWriter` in `using`/`await using`.
* Prefer async file APIs in async code paths.
* Use lazy enumeration (`File.ReadLines`, `Directory.EnumerateFiles`) over eager loading (`ReadAllLines`, `GetFiles`) for large inputs.

---

## Related Features

See also:

* Performance Tips
* Common Compiler Errors
* Dependency Injection
* Configuration

---

## Official Documentation

* [.NET application architecture guides](https://learn.microsoft.com/en-us/dotnet/architecture/)
* [C# coding conventions](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)
