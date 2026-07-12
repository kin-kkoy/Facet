# Solutions (.sln)

A container that groups multiple related projects for building and IDE navigation.

---

## Quick Summary

A `.sln` file lists one or more `.csproj` (or other project type) files along with build configuration mappings, letting an IDE or the `dotnet` CLI build and manage several related projects (e.g., an app, its class libraries, and its test project) as one unit. Solutions are an organizational/tooling construct — they are not compiled into any output artifact themselves.

---

## Syntax

```bash
# Create a new, empty solution
dotnet new sln -n MySolution

# Add existing projects to it
dotnet sln add MyApp/MyApp.csproj
dotnet sln add MyApp.Tests/MyApp.Tests.csproj

# Build every project in the solution
dotnet build MySolution.sln
```

---

## Syntax Variations

```bash
# Add multiple projects at once
dotnet sln add MyApp/MyApp.csproj MyLibrary/MyLibrary.csproj

# Remove a project from the solution
dotnet sln remove MyLibrary/MyLibrary.csproj

# List projects in a solution
dotnet sln list

# Add projects matching a glob
dotnet sln add **/*.csproj

# Run tests across every test project in the solution
dotnet test MySolution.sln
```

---

## Examples

```bash
# Typical multi-project solution layout
dotnet new sln -n Shop
dotnet new webapi -n Shop.Api
dotnet new classlib -n Shop.Domain
dotnet new xunit -n Shop.Tests

dotnet sln add Shop.Api/Shop.Api.csproj
dotnet sln add Shop.Domain/Shop.Domain.csproj
dotnet sln add Shop.Tests/Shop.Tests.csproj

dotnet add Shop.Api reference Shop.Domain
dotnet add Shop.Tests reference Shop.Api
```

```bash
# Build and test the entire solution in one command
dotnet build Shop.sln
dotnet test Shop.sln
```

```text
Realistic solution folder structure:

Shop.sln
Shop.Api/
    Shop.Api.csproj
Shop.Domain/
    Shop.Domain.csproj
Shop.Tests/
    Shop.Tests.csproj
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Multi-project grouping | ⭐ `.sln` file referencing multiple `.csproj` files | ⚠ Top-level `Makefile`/`CMakeLists.txt` including subdirectories | ⚠ Multi-module Maven `pom.xml` (parent/child) or Gradle multi-project `settings.gradle` |
| Compiled artifact | ✅ None — `.sln` is IDE/tooling metadata only | ❌ N/A | ✅ None — parent POM/settings file is also metadata only |
| IDE integration | ⭐ Native (Visual Studio, Rider, VS Code) | ❌ N/A (project-specific IDE configs) | ⚠ IDE reads `pom.xml`/`build.gradle` directly, no separate solution file |
| Build one command for all projects | ⭐ `dotnet build MySolution.sln` | ⚠ `make all` (manual target) | ⚠ `mvn install` from parent / `gradle build` |

---

## Common Patterns

```bash
# Solution filter files (.slnf) to build/load a subset in large solutions
dotnet build MySolution.slnf
```

```text
# Typical grouping by responsibility
MyApp.sln
  MyApp.Api        (entry point)
  MyApp.Domain     (business logic)
  MyApp.Infrastructure (data access, external services)
  MyApp.Tests      (unit/integration tests)
```

---

## Common Mistakes

### Coming from C

Expecting to need a hand-written top-level `Makefile` that manually invokes each sub-project's build in the right dependency order — `dotnet build` on a `.sln` resolves the project reference graph and builds in the correct order automatically.

```bash
# Unnecessary manual ordering
cd Shop.Domain && dotnet build
cd ../Shop.Api && dotnet build
```

Correct approach: build the solution once; MSBuild figures out the dependency order from `ProjectReference` entries.

```bash
dotnet build Shop.sln
```

### Coming from Java

Assuming the `.sln` file itself declares shared dependency versions or parent-level configuration the way a Maven parent POM does — a `.sln` only lists project paths and configuration/platform mappings; shared build settings belong in `Directory.Build.props`, not the solution file.

```xml
<!-- This kind of shared config does NOT belong in .sln -->
<PropertyGroup><Nullable>enable</Nullable></PropertyGroup>
```

Correct approach: put cross-project settings in a `Directory.Build.props` file at the repo root; keep the `.sln` limited to project membership and configurations.

---

## Performance Notes

Building via a `.sln` doesn't add meaningful overhead beyond building each contained project — MSBuild parallelizes independent projects within the graph by default. Very large solutions (hundreds of projects) can slow IDE load/IntelliSense; solution filters (`.slnf`) mitigate this by loading only a relevant subset.

---

## Related Features

See also:

* dotnet CLI
* Projects (.csproj)
* NuGet

---

## Best Practices

* Group related projects (app, libraries, tests) into one solution per repository/product area.
* Use solution filters (`.slnf`) for large solutions to speed up IDE loading.
* Keep cross-cutting build settings in `Directory.Build.props`, not duplicated per-project or crammed into the `.sln`.
* Name projects and folders consistently (e.g., `Shop.Api`, `Shop.Domain`) to keep the solution navigable.

---

## Common APIs

(N/A — solution files are tooling metadata, not a runtime API)

dotnet sln

dotnet build

dotnet test

---

## Notes

The newer JSON-based solution file format (`.slnx`), introduced to simplify diffing and merging compared to the legacy `.sln` text format, is being adopted incrementally across the .NET tooling ecosystem.

---

## Official Documentation

* [dotnet sln command](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-sln)
* [How to structure .NET projects and solutions](https://learn.microsoft.com/en-us/dotnet/core/tutorials/library-with-visual-studio)
