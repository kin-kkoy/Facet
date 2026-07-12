# Logging

The built-in abstraction for structured, provider-based application logging.

---

## Quick Summary

`Microsoft.Extensions.Logging` provides a provider-agnostic logging abstraction (`ILogger<T>`) used throughout the .NET ecosystem, from console apps to ASP.NET Core. Log messages support structured, named placeholders (not string interpolation) so providers can capture parameters as first-class data rather than just formatted text. Popular third-party providers (Serilog, NLog) plug into the same abstraction.

---

## Syntax

```csharp
using Microsoft.Extensions.Logging;

public class OrderService
{
    private readonly ILogger<OrderService> _logger;

    public OrderService(ILogger<OrderService> logger) => _logger = logger;

    public void PlaceOrder(int orderId)
    {
        _logger.LogInformation("Order {OrderId} placed", orderId);
    }
}
```

---

## Syntax Variations

```csharp
// Log levels
_logger.LogTrace("Very detailed trace info");
_logger.LogDebug("Debug info: {Value}", value);
_logger.LogInformation("Informational message");
_logger.LogWarning("Something unexpected: {Reason}", reason);
_logger.LogError(exception, "Operation failed for {Id}", id);
_logger.LogCritical("Unrecoverable failure");

// Structured logging with multiple parameters
_logger.LogInformation("User {UserId} performed {Action} at {Timestamp}",
    userId, action, DateTime.UtcNow);

// Scopes for correlating related log entries
using (_logger.BeginScope("OrderProcessing:{OrderId}", orderId))
{
    _logger.LogInformation("Validating order");
    _logger.LogInformation("Charging payment");
}

// Configuring providers/minimum level (Program.cs, minimal hosting)
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Information);
```

---

## Examples

```csharp
// Console app with dependency-injected logging
using Microsoft.Extensions.Logging;

using var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
ILogger logger = loggerFactory.CreateLogger("Program");

logger.LogInformation("Application started at {Time}", DateTimeOffset.UtcNow);
```

```csharp
// ASP.NET Core minimal API
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/orders/{id}", (int id, ILogger<Program> logger) =>
{
    logger.LogInformation("Fetching order {OrderId}", id);
    return Results.Ok();
});

app.Run();
```

```csharp
// Realistic usage: logging exceptions with context
try
{
    ProcessPayment(order);
}
catch (PaymentException ex)
{
    _logger.LogError(ex, "Payment failed for order {OrderId}, amount {Amount}",
        order.Id, order.Total);
    throw;
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Built-in logging abstraction | ⭐ `Microsoft.Extensions.Logging` (`ILogger<T>`), part of the standard hosting model | ❌ N/A — typically `printf`/`syslog` or a third-party lib | ⚠ SLF4J is the de facto standard abstraction, but not built into the JDK |
| Structured logging | ⭐ Named placeholders (`{OrderId}`) captured as structured data by providers | ❌ N/A | ⚠ Supported by some backends (e.g., Logback + Logstash encoder), less uniform |
| DI-friendly | ⭐ `ILogger<T>` injected automatically, category derived from `T` | ❌ N/A | ⚠ `LoggerFactory.getLogger(Class)` manually per class, common convention not automatic injection |
| Provider ecosystem | ⭐ Console, Debug, EventLog, plus third-party (Serilog, NLog) via one abstraction | ❌ N/A | ✅ Similar breadth via SLF4J bindings (Logback, Log4j2) |

---

## Common Patterns

```csharp
// Category convention: ILogger<T> where T is the containing class
public class PaymentProcessor
{
    private readonly ILogger<PaymentProcessor> _logger;
    public PaymentProcessor(ILogger<PaymentProcessor> logger) => _logger = logger;
}

// Conditional expensive logging (avoid building strings for disabled levels)
if (_logger.IsEnabled(LogLevel.Debug))
{
    _logger.LogDebug("Expensive payload: {Payload}", ComputeExpensivePayload());
}
```

---

## Common Mistakes

### Coming from C

Building the full log message via string concatenation/interpolation before passing it to the logger (as with `printf`-style formatting), losing the structured-data benefits that named placeholders provide to providers/backends.

```csharp
// Loses structured data — becomes an opaque string to log backends
_logger.LogInformation($"Order {orderId} placed for {amount:C}");
```

Correct approach: use message templates with named placeholders so parameters remain queryable structured fields.

```csharp
_logger.LogInformation("Order {OrderId} placed for {Amount}", orderId, amount);
```

### Coming from Java

Manually instantiating a logger per class via a static factory call (mirroring `LoggerFactory.getLogger(MyClass.class)`), instead of relying on constructor-injected `ILogger<T>`, which the DI container wires up automatically with the correct category name.

```csharp
// Unnecessary manual instantiation — bypasses DI-provided configuration
private readonly ILogger _logger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger("MyClass");
```

Correct approach: inject `ILogger<T>` through the constructor.

```csharp
public class MyClass
{
    private readonly ILogger<MyClass> _logger;
    public MyClass(ILogger<MyClass> logger) => _logger = logger;
}
```

---

## Performance Notes

Structured logging with named placeholders avoids string formatting entirely when the log level is disabled — the framework checks `IsEnabled` before formatting, so passing raw parameters (not pre-formatted strings) is both more efficient and preserves structure. `LoggerMessage.Define`/the `[LoggerMessage]` source generator (in newer .NET versions) eliminates boxing and allocation overhead for high-frequency log call sites, generating strongly-typed, cached delegates at compile time.

---

## Related Features

See also:

* Dependency Injection
* Configuration
* Exceptions

---

## Best Practices

* Always use message templates with named placeholders (`{OrderId}`), never string interpolation, in log calls.
* Inject `ILogger<T>` via constructor rather than constructing loggers manually.
* Use `LogError`/`LogCritical` overloads that accept an `Exception` parameter to capture the full stack trace.
* Consider the `[LoggerMessage]` source-generator attribute for very high-frequency logging call sites.

---

## Common APIs

ILogger\<T\>

ILoggerFactory

LogLevel

LoggerMessage

---

## Notes

Log level filtering can be configured per-category in `appsettings.json` under `"Logging":{"LogLevel": {...}}`, allowing different verbosity for different namespaces without recompiling.

---

## Official Documentation

* [Logging in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging)
* [High-performance logging with LoggerMessage](https://learn.microsoft.com/en-us/dotnet/core/extensions/high-performance-logging)
