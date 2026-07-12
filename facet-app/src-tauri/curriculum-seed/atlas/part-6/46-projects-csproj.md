# Projects (.csproj)

The XML-based project file that defines how a .NET project is built.

---

## Quick Summary

A `.csproj` file is an MSBuild XML document describing a project's target framework, dependencies, source files, and build settings. Modern SDK-style `.csproj` files (introduced with .NET Core) are minimal by default — files are included implicitly via glob patterns rather than listed individually, unlike legacy .NET Framework project files.

---

## Syntax

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

</Project>
```

---

## Syntax Variations

```xml
<!-- Multi-targeting -->
<PropertyGroup>
  <TargetFrameworks>net9.0;net8.0</TargetFrameworks>
</PropertyGroup>

<!-- Package reference -->
<ItemGroup>
  <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
</ItemGroup>

<!-- Project reference -->
<ItemGroup>
  <ProjectReference Include="..\MyLibrary\MyLibrary.csproj" />
</ItemGroup>

<!-- Excluding files from implicit globbing -->
<ItemGroup>
  <Compile Remove="Scripts\**\*.cs" />
</ItemGroup>

<!-- Conditional properties per configuration -->
<PropertyGroup Condition="'$(Configuration)'=='Release'">
  <Optimize>true</Optimize>
</PropertyGroup>

<!-- Assembly metadata -->
<PropertyGroup>
  <AssemblyVersion>1.2.0.0</AssemblyVersion>
  <Version>1.2.0</Version>
</PropertyGroup>
```

---

## Examples

```xml
<!-- Minimal console app -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
</Project>
```

```xml
<!-- Class library with a NuGet dependency -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Serilog" Version="4.0.0" />
  </ItemGroup>
</Project>
```

```xml
<!-- Realistic ASP.NET Core Web API project -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <InvariantGlobalization>true</InvariantGlobalization>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.6.2" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\MyApp.Data\MyApp.Data.csproj" />
  </ItemGroup>
</Project>
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Project file format | ⭐ SDK-style `.csproj` (XML, MSBuild) | ⚠ `Makefile`/`CMakeLists.txt` (no standard format) | ⚠ `pom.xml` (Maven, XML) / `build.gradle` (Groovy/Kotlin DSL) |
| File inclusion | ⭐ Implicit glob (`**/*.cs` included by default) | ❌ Explicit file lists required | ⚠ Convention-based directory layout (`src/main/java`), not glob-per-file |
| Dependency declaration | ⭐ `<PackageReference>` (NuGet) | ❌ N/A | ⚠ `<dependency>` (Maven) / `implementation '...'` (Gradle) |
| Multi-targeting | ⭐ `<TargetFrameworks>` (plural) for multiple frameworks in one project | ❌ N/A | ⚠ Requires separate build profiles/modules |

---

## Common Patterns

```xml
<!-- Central package version management (Directory.Packages.props) -->
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
</Project>

<!-- Shared properties across multiple projects (Directory.Build.props) -->
<Project>
  <PropertyGroup>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
```

---

## Common Mistakes

### Coming from C

Expecting to need to list every `.c`/`.h` file explicitly (as in a `Makefile`), and manually adding every new `.cs` file to the project — SDK-style projects include all `.cs` files under the project directory automatically via implicit globbing.

```xml
<!-- Unnecessary — SDK-style projects don't require this -->
<ItemGroup>
  <Compile Include="Program.cs" />
  <Compile Include="Helper.cs" />
</ItemGroup>
```

Correct approach: just add the `.cs` file to the folder; no project file edit needed unless excluding it.

### Coming from Java

Expecting a `pom.xml`-style single global repository/dependency resolution model with `<dependencyManagement>` scattered per-module by default, and being unsure where NuGet package sources are configured — those live in `NuGet.Config`, not the `.csproj` itself.

```xml
<!-- Package SOURCES don't go in .csproj -->
<PackageSource Include="https://my-feed/index.json" /> <!-- wrong location -->
```

Correct approach: configure feeds in a `NuGet.Config` file, and reference only package name/version in `.csproj`.

```xml
<PackageReference Include="MyPackage" Version="1.0.0" />
```

---

## Performance Notes

Fewer, larger `PropertyGroup`/`ItemGroup` conditions evaluate faster than many scattered conditionals during MSBuild evaluation, though this is rarely a practical bottleneck. Multi-targeting (`<TargetFrameworks>`) multiplies build time linearly with the number of target frameworks since each is compiled separately.

---

## Related Features

See also:

* dotnet CLI
* Solutions (.sln)
* NuGet

---

## Best Practices

* Use SDK-style projects (default for all `dotnet new` templates) — avoid legacy verbose project XML.
* Centralize shared settings in `Directory.Build.props` for multi-project repositories.
* Use `Directory.Packages.props` for centralized NuGet version management across a solution.
* Keep `TargetFramework` current with supported .NET releases; multi-target only when shipping a library to consumers on multiple runtimes.

---

## Common APIs

(N/A — project file format, not a runtime API)

Microsoft.NET.Sdk

Microsoft.NET.Sdk.Web

PackageReference

ProjectReference

---

## Notes

The `Sdk="Microsoft.NET.Sdk"` attribute determines which implicit build targets/props are imported; `Microsoft.NET.Sdk.Web` adds ASP.NET Core-specific behavior, and `Microsoft.NET.Sdk.Worker` targets background service templates.

---

## Official Documentation

* [.NET project SDKs](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/overview)
* [MSBuild project file schema reference](https://learn.microsoft.com/en-us/visualstudio/msbuild/msbuild-project-file-schema-reference)
