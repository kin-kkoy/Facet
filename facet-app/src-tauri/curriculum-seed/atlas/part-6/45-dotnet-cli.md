# dotnet CLI

The command-line interface for building, running, and managing .NET projects.

---

## Quick Summary

The `dotnet` CLI is the primary tool for creating, building, running, testing, and publishing .NET applications, and for managing packages and tool installations. It is cross-platform (Windows, Linux, macOS) and replaces most IDE-only workflows for automation and CI/CD scenarios.

---

## Syntax

```bash
dotnet new console -n MyApp
dotnet build
dotnet run
dotnet test
dotnet publish -c Release
```

---

## Syntax Variations

```bash
# Create projects from templates
dotnet new classlib -n MyLibrary
dotnet new webapi -n MyApi
dotnet new list                      # list available templates

# Restore dependencies explicitly
dotnet restore

# Build with configuration
dotnet build -c Release

# Run with arguments passed to the app
dotnet run -- --port 5000

# Publish self-contained / single-file
dotnet publish -c Release -r linux-x64 --self-contained true /p:PublishSingleFile=true

# Add/remove packages
dotnet add package Newtonsoft.Json
dotnet remove package Newtonsoft.Json

# Manage project references
dotnet add reference ../MyLibrary/MyLibrary.csproj

# Global tools
dotnet tool install -g dotnet-ef
dotnet tool list -g

# Solution management
dotnet new sln -n MySolution
dotnet sln add MyApp/MyApp.csproj
```

---

## Examples

```bash
# Scaffold and run a new console app
dotnet new console -n HelloWorld
cd HelloWorld
dotnet run
```

```bash
# Add a test project and reference the main project
dotnet new xunit -n MyApp.Tests
dotnet add MyApp.Tests reference MyApp/MyApp.csproj
dotnet test
```

```bash
# Realistic CI pipeline sequence
dotnet restore
dotnet build -c Release --no-restore
dotnet test -c Release --no-build
dotnet publish -c Release --no-build -o ./artifacts
```

```bash
# Watch mode for rapid iteration
dotnet watch run
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Build tool | ⭐ `dotnet build` (MSBuild under the hood) | ⚠ `make`/`gcc`/`cmake` (fragmented, no standard) | ⚠ Maven (`mvn`) / Gradle (`gradle`) — similar role, different ecosystem |
| Scaffolding new projects | ⭐ `dotnet new <template>` | ❌ N/A | ⚠ `mvn archetype:generate` / Spring Initializr |
| Package management | ⭐ `dotnet add package` (NuGet) | ❌ N/A — manual linking or vcpkg/conan | ⚠ `pom.xml` dependency / `build.gradle` dependency |
| Cross-platform single tool | ⭐ One `dotnet` CLI for build/run/test/publish/tools across OSes | ❌ N/A | ⚠ Similar coverage via Maven/Gradle, but JVM-specific tooling varies |
| Live reload dev loop | ⭐ `dotnet watch run` | ❌ N/A | ⚠ Spring DevTools / JRebel (third-party) |

---

## Common Patterns

```bash
# Typical local dev loop
dotnet watch run

# Typical CI sequence
dotnet restore && dotnet build --no-restore -c Release && dotnet test --no-build

# Publishing a container-ready output
dotnet publish -c Release -o ./out
```

---

## Common Mistakes

### Coming from C

Expecting to write a `Makefile` or invoke a compiler (`gcc`/`clang`) directly per file; not realizing `dotnet build` orchestrates the entire compilation graph (including transitive project/package references) from the project file automatically.

```bash
# Unnecessary manual invocation — csc alone doesn't resolve project references/NuGet packages
csc Program.cs
```

Correct approach: let the CLI resolve the project file and its dependency graph.

```bash
dotnet build
```

### Coming from Java

Expecting a `pom.xml`/`build.gradle`-style multi-phase lifecycle (`compile`, `test`, `package`, `install`, `deploy`) with a single `mvn install`; .NET splits these into discrete `dotnet` verbs (`build`, `test`, `publish`) rather than one unified lifecycle command.

```bash
# There's no single "install" phase equivalent
dotnet install   # not a real command
```

Correct approach: chain the specific verbs needed.

```bash
dotnet restore
dotnet build
dotnet test
dotnet publish
```

---

## Performance Notes

`dotnet build` uses incremental compilation via MSBuild — unchanged projects are skipped on subsequent builds. `dotnet publish -r <RID> --self-contained` bundles the runtime, increasing output size but removing the target machine's dependency on a shared .NET runtime install. `ReadyToRun`/AOT publishing options (`PublishReadyToRun`, `PublishAot`) trade build time and size for faster startup.

---

## Related Features

See also:

* Projects (.csproj)
* Solutions (.sln)
* NuGet

---

## Best Practices

* Use `dotnet watch run` during local development for automatic rebuild/restart on file changes.
* Pass `--no-restore`/`--no-build` in CI to avoid redundant work across pipeline stages.
* Pin the SDK version with a `global.json` file for reproducible builds across machines.
* Use `dotnet tool install -g` for developer tools (e.g., `dotnet-ef`) rather than committing binaries to source control.

---

## Common APIs

(N/A — CLI tool, not a runtime API)

dotnet build

dotnet run

dotnet publish

dotnet test

dotnet add package

---

## Notes

The `dotnet` CLI is itself built on MSBuild; `.csproj`/`.sln` files are the actual build graph definitions the CLI reads and executes.

---

## Official Documentation

* [.NET CLI overview](https://learn.microsoft.com/en-us/dotnet/core/tools/)
* [dotnet command reference](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet)
