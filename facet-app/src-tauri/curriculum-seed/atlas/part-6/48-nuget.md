# NuGet

The package manager and hosting ecosystem for .NET libraries.

---

## Quick Summary

NuGet is the standard package manager for .NET, distributing reusable libraries as `.nupkg` archives. Packages are referenced in a `.csproj` via `<PackageReference>`, resolved from configured feeds (typically nuget.org or a private feed), and restored into a per-user global package cache. NuGet also handles transitive dependency resolution and version conflict management automatically.

---

## Syntax

```bash
# Add a package to the current project
dotnet add package Newtonsoft.Json

# Add a specific version
dotnet add package Serilog --version 4.0.0

# Remove a package
dotnet remove package Newtonsoft.Json

# Restore all packages for a project/solution
dotnet restore

# List installed packages, including outdated ones
dotnet list package
dotnet list package --outdated
```

---

## Syntax Variations

```xml
<!-- Direct PackageReference in .csproj -->
<ItemGroup>
  <PackageReference Include="AutoMapper" Version="13.0.1" />
</ItemGroup>

<!-- Floating version (latest matching pattern) -->
<PackageReference Include="Serilog" Version="4.*" />

<!-- Version range -->
<PackageReference Include="Newtonsoft.Json" Version="[13.0.0,14.0.0)" />

<!-- PrivateAssets to prevent a build-time-only package from flowing downstream -->
<PackageReference Include="Microsoft.SourceLink.GitHub" Version="8.0.0" PrivateAssets="All" />
```

```xml
<!-- NuGet.Config for custom/private feeds -->
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
    <add key="CompanyFeed" value="https://pkgs.mycompany.com/nuget/index.json" />
  </packageSources>
</configuration>
```

---

## Examples

```bash
# Adding logging support to a project
dotnet add package Serilog.AspNetCore
```

```xml
<!-- Central package version management across a whole solution -->
<!-- Directory.Packages.props -->
<Project>
  <ItemGroup>
    <PackageVersion Include="Serilog" Version="4.0.0" />
    <PackageVersion Include="AutoMapper" Version="13.0.1" />
  </ItemGroup>
</Project>
```

```xml
<!-- Each project then references without a version (resolved centrally) -->
<ItemGroup>
  <PackageReference Include="Serilog" />
</ItemGroup>
```

```bash
# Realistic workflow: audit and update dependencies
dotnet list package --outdated
dotnet add package Serilog --version 4.1.0
dotnet restore
dotnet build
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Package manager | ⭐ NuGet (`dotnet add package`, nuget.org) | ❌ N/A — vcpkg/Conan exist but are not universally standard | ⚠ Maven Central (via `pom.xml`) / Gradle |
| Dependency declaration location | ⭐ `<PackageReference>` in `.csproj` | ❌ N/A | ⚠ `<dependency>` in `pom.xml` / `implementation` in `build.gradle` |
| Transitive dependency resolution | ⭐ Automatic, NuGet resolves the full graph | ❌ Manual — must vendor or link each transitive lib yourself | ✅ Automatic, same concept as NuGet |
| Central version management | ⭐ `Directory.Packages.props` (CPM) | ❌ N/A | ⚠ Maven `<dependencyManagement>` / Gradle version catalogs |
| Package cache location | ⭐ Global per-user cache (`~/.nuget/packages`), shared across projects | ❌ N/A | ⚠ Local Maven repo (`~/.m2/repository`), similar concept |

---

## Common Patterns

```bash
# Locking dependency versions for reproducible restores (packages.lock.json)
dotnet restore --use-lock-file
```

```xml
<!-- Excluding a package's assets you don't need (e.g., analyzers only) -->
<PackageReference Include="StyleCop.Analyzers" Version="1.2.0-beta.556">
  <PrivateAssets>all</PrivateAssets>
  <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
</PackageReference>
```

---

## Common Mistakes

### Coming from C

Expecting to manually download, extract, and link a library's headers/binaries (as with vendored C libraries), and being unaware that NuGet packages resolve and restore transitive dependencies automatically as part of `dotnet restore`/`dotnet build`.

```bash
# Unnecessary manual approach — not how NuGet works
wget https://example.com/somelib.zip && unzip somelib.zip
```

Correct approach: reference the package by name/version and let NuGet handle acquisition and linking.

```bash
dotnet add package SomeLib
```

### Coming from Java

Assuming package coordinates need a `groupId:artifactId:version` triplet like Maven — NuGet packages are identified by a single package ID (no separate group namespace) plus a version.

```xml
<!-- Incorrect — NuGet has no groupId concept -->
<PackageReference Include="com.example:mylib" Version="1.0.0" />
```

Correct approach:

```xml
<PackageReference Include="MyLib" Version="1.0.0" />
```

---

## Performance Notes

Restored packages are cached once globally per machine (`~/.nuget/packages`) and referenced from there by every project needing them — subsequent restores for other projects using the same package/version are effectively free disk-wise. `packages.lock.json` (via `--use-lock-file`) pins exact resolved versions for faster, deterministic restores in CI. Floating versions (`Version="4.*"`) can slow restores slightly since NuGet must query the feed for the latest matching version each time, unlike a pinned exact version.

---

## Related Features

See also:

* dotnet CLI
* Projects (.csproj)
* Solutions (.sln)

---

## Best Practices

* Pin exact versions in production code; avoid floating versions (`4.*`) except in fast-moving internal tooling.
* Use Central Package Management (`Directory.Packages.props`) for multi-project solutions to avoid version drift.
* Enable lock files (`packages.lock.json`) in CI for reproducible restores.
* Regularly audit with `dotnet list package --outdated` and `--vulnerable`.

---

## Common APIs

(N/A — package ecosystem, not a runtime API)

PackageReference

Directory.Packages.props

NuGet.Config

dotnet add package

---

## Notes

`dotnet list package --vulnerable` checks installed packages against known vulnerability advisories, useful as a lightweight supply-chain security check in CI pipelines.

---

## Official Documentation

* [NuGet documentation](https://learn.microsoft.com/en-us/nuget/what-is-nuget)
* [Package references (PackageReference) in project files](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files)
