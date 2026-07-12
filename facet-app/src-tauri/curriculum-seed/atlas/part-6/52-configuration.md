# Configuration

The layered, provider-based system for supplying application settings.

---

## Quick Summary

`Microsoft.Extensions.Configuration` builds an application's configuration from multiple layered sources — JSON files, environment variables, command-line arguments, user secrets, and more — merged into a single `IConfiguration` object. Later-added sources override earlier ones by key, which is how environment-specific overrides (e.g., `appsettings.Production.json` over `appsettings.json`) work.

---

## Syntax

```csharp
var builder = WebApplication.CreateBuilder(args);

// Configuration is pre-wired in the host builder:
// appsettings.json, appsettings.{Environment}.json, env vars, command line
string? connectionString = builder.Configuration.GetConnectionString("Default");
string? apiKey = builder.Configuration["ApiKey"];
```

---

## Syntax Variations

```csharp
// Binding a section to a strongly-typed class
public class MailSettings
{
    public string Host { get; set; } = "";
    public int Port { get; set; }
}

var mailSettings = builder.Configuration.GetSection("Mail").Get<MailSettings>();

// Options pattern with DI
builder.Services.Configure<MailSettings>(builder.Configuration.GetSection("Mail"));

public class EmailService
{
    private readonly MailSettings _settings;
    public EmailService(IOptions<MailSettings> options) => _settings = options.Value;
}

// Manually building configuration (e.g., in a console app)
IConfiguration config = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json", optional: false)
    .AddEnvironmentVariables()
    .AddCommandLine(args)
    .Build();

// Nested key access via colon-separated path
string? smtpHost = config["Mail:Host"];
```

```json
// appsettings.json
{
  "Mail": {
    "Host": "smtp.example.com",
    "Port": 587
  },
  "ConnectionStrings": {
    "Default": "Server=.;Database=Shop;Trusted_Connection=True;"
  }
}
```

---

## Examples

```csharp
// Reading a simple flat value
string environment = builder.Configuration["ASPNETCORE_ENVIRONMENT"] ?? "Production";
```

```csharp
// Binding an array/list from configuration
// appsettings.json: { "AllowedOrigins": [ "https://a.com", "https://b.com" ] }
string[] origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];
```

```csharp
// Realistic usage: options pattern with validation
builder.Services.AddOptions<MailSettings>()
    .Bind(builder.Configuration.GetSection("Mail"))
    .Validate(s => !string.IsNullOrEmpty(s.Host), "Mail:Host is required")
    .ValidateOnStart();
```

```csharp
// Overriding config via environment variables (double underscore for nesting)
// export Mail__Host=smtp.override.com
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Layered configuration sources | ⭐ JSON, env vars, CLI args, user secrets merged automatically by precedence | ❌ N/A — manual `getenv`/argv parsing | ⚠ Spring `application.properties`/`application.yml` + profiles (similar concept, Spring-specific) |
| Strongly-typed binding | ⭐ `.Get<T>()` / Options pattern (`IOptions<T>`) | ❌ N/A | ⚠ `@ConfigurationProperties` (Spring Boot) |
| Environment-specific overrides | ⭐ `appsettings.{Environment}.json` convention | ❌ N/A | ⚠ Spring profiles (`application-{profile}.yml`) |
| Nested key syntax | ⭐ Colon (`Mail:Host`) or double-underscore in env vars (`Mail__Host`) | ❌ N/A | ⚠ Dot notation (`mail.host`) |
| Framework-agnostic (works outside a specific framework) | ⭐ `Microsoft.Extensions.Configuration` usable in any app type | ❌ N/A | ❌ Deeply tied to Spring; no equivalent standalone in plain Java |

---

## Common Patterns

```csharp
// Options pattern is the idiomatic way to consume config in services
builder.Services.Configure<MailSettings>(builder.Configuration.GetSection("Mail"));

// Secrets kept out of source control during development
// dotnet user-secrets set "Mail:Password" "hunter2"
var password = builder.Configuration["Mail:Password"];
```

---

## Common Mistakes

### Coming from C

Reading configuration manually via `Environment.GetEnvironmentVariable` scattered throughout the codebase (mirroring `getenv` calls in C), rather than centralizing config access through `IConfiguration`/the Options pattern, which unifies multiple sources and supports strongly-typed binding.

```csharp
// Bypasses the unified configuration system and its layering/precedence rules
string? host = Environment.GetEnvironmentVariable("MAIL_HOST");
```

Correct approach: read through `IConfiguration`, which already merges environment variables with other sources.

```csharp
string? host = builder.Configuration["Mail:Host"];
```

### Coming from Java

Expecting a single `application.properties`-equivalent file with dot-separated keys, and being confused by the colon (`:`) separator used in code (`Mail:Host`) versus the double-underscore (`Mail__Host`) required for environment variable keys, since underscores aren't valid in most shells for other separators.

```bash
# Incorrect — colons generally don't work as env var separators across shells
export Mail:Host=smtp.example.com
```

Correct approach: use double underscores for environment variable keys, which the configuration system maps back to the colon-separated hierarchy.

```bash
export Mail__Host=smtp.example.com
```

---

## Performance Notes

`IConfiguration` values are re-read from underlying providers on each access unless cached (JSON file providers cache in memory and can watch for file changes with `reloadOnChange: true`); binding to a strongly-typed class via `.Get<T>()` uses reflection and has proportional overhead, so avoid rebinding very large sections in hot paths — cache the bound object once at startup instead.

---

## Related Features

See also:

* Dependency Injection
* Logging
* File I/O

---

## Best Practices

* Use the Options pattern (`IOptions<T>`/`IOptionsSnapshot<T>`/`IOptionsMonitor<T>`) rather than reading raw `IConfiguration` keys scattered through business logic.
* Keep secrets out of `appsettings.json`; use user secrets locally and a secret manager (e.g., Key Vault) in production.
* Use `appsettings.{Environment}.json` for environment-specific overrides rather than conditional code.
* Validate critical configuration at startup (`ValidateOnStart()`) to fail fast rather than at first use.

---

## Common APIs

IConfiguration

IOptions\<T\>

IOptionsMonitor\<T\>

ConfigurationBuilder

---

## Notes

`IOptionsMonitor<T>` supports live-reloading configuration values at runtime (e.g., when `appsettings.json` changes on disk with `reloadOnChange: true`), whereas `IOptions<T>` captures a snapshot resolved once at startup.

---

## Official Documentation

* [Configuration in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/configuration)
* [Options pattern in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/options)
