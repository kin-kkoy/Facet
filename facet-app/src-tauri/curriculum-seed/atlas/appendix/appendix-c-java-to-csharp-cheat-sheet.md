# Appendix C — Java → C# Cheat Sheet

Quick side-by-side mappings for developers coming from Java.

---

## Quick Summary

C# and Java share a common OOP heritage (classes, interfaces, garbage collection, checked-ish exceptions in spirit), so most concepts transfer directly — but naming conventions, collection APIs, and several language features differ. This sheet maps common Java idioms to their C# equivalents.

---

## Naming & Conventions

| Java | C# | Notes |
|---|---|---|
| `camelCase` methods | `PascalCase` methods | `getName()` → `GetName()`/`Name` property |
| `camelCase` fields | `PascalCase` properties, `_camelCase` private fields | Convention, not enforced by the compiler |
| Getters/setters (`getX()`/`setX()`) | Properties (`public int X { get; set; }`) | No explicit getter/setter methods needed |
| `package` | `namespace` | Similar concept, different keyword |
| `import` | `using` | Namespace import |

---

## Types & Collections

| Java | C# | Notes |
|---|---|---|
| `ArrayList<T>` | `List<T>` | Both resizable arrays under the hood |
| `HashMap<K,V>` | `Dictionary<TKey,TValue>` | Same hash-table concept |
| `HashSet<T>` | `HashSet<T>` | Same name and concept |
| `Optional<T>` | Nullable Reference Types (`T?`) or `Nullable<T>` for value types | Compiler-enforced flow analysis, not a wrapper type |
| `String` (immutable) | `string` (immutable) | Same semantics; C# `string` is a keyword alias for `System.String` |
| `final` | `readonly` (fields), `const` (compile-time constants), `sealed` (classes/methods) | Split across three keywords depending on context |
| `interface` with default methods | `interface` with default implementations (C# 8+) | Similar capability, added later to C# |
| Checked exceptions (`throws IOException`) | No checked exceptions — all exceptions unchecked | No `throws` clause; document exceptions via XML doc comments instead |

---

## Functional & Concurrency

| Java | C# | Notes |
|---|---|---|
| Lambda `x -> x * x` | Lambda `x => x * x` | Same concept, different arrow token |
| `Stream<T>` / `stream().filter().map()` | `IEnumerable<T>` / LINQ (`.Where().Select()`) | LINQ queries are re-enumerable; Java streams are single-use |
| `CompletableFuture<T>` | `Task<T>` | `await` gives C# a more linear syntax than chained `.thenApply()` |
| `@FunctionalInterface` | `Action`/`Func`/custom `delegate` | C# has built-in generic delegate types, less need for custom interfaces |
| `synchronized` block | `lock` statement | Same monitor-based mutual exclusion concept |
| Virtual threads (`Thread.ofVirtual()`) | `Task`/thread-pool scheduling via `async`/`await` | Different underlying models, similar goal of high-concurrency without OS thread exhaustion |

---

## Build & Ecosystem

| Java | C# | Notes |
|---|---|---|
| Maven/Gradle | `dotnet` CLI + NuGet | `pom.xml`/`build.gradle` → `.csproj` + `PackageReference` |
| Spring dependency injection | `Microsoft.Extensions.DependencyInjection` | Built into the standard hosting model, not framework-specific |
| SLF4J + Logback | `Microsoft.Extensions.Logging` | Built-in abstraction, part of the BCL/hosting model |
| JUnit | xUnit / NUnit / MSTest | xUnit is most common in modern .NET projects |

---

## Common Patterns

```csharp
// Java: getter/setter pair
// private String name;
// public String getName() { return name; }
// public void setName(String name) { this.name = name; }

// C#: auto-property
public string Name { get; set; } = "";
```

```csharp
// Java: Optional<String>
// Optional<String> maybeName = Optional.ofNullable(getName());

// C#: nullable reference type
string? maybeName = GetName();
```

---

## Common Mistakes

* Writing Java-style getter/setter methods instead of using C# properties.
* Expecting `throws` declarations — C# doesn't have checked exceptions; any method can throw any exception without declaring it.
* Assuming LINQ queries behave like Java Streams (single-use) — `IEnumerable<T>` queries are deferred and re-executable on each enumeration.
* Reaching for a custom `@FunctionalInterface`-style delegate when `Action`/`Func` already covers the shape needed.

---

## Related Features

See also:

* Properties
* Exceptions
* LINQ
* Dependency Injection

---

## Official Documentation

* [C# for Java developers](https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/)
