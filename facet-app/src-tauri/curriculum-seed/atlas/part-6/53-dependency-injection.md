# Dependency Injection

The built-in inversion-of-control container for managing object lifetimes and dependencies.

---

## Quick Summary

`Microsoft.Extensions.DependencyInjection` is a lightweight, built-in IoC container used throughout ASP.NET Core and the generic host. Services are registered against interfaces with one of three lifetimes — Singleton, Scoped, or Transient — and resolved automatically via constructor injection. Unlike some ecosystems, dependency injection is a first-class, framework-integrated concept rather than a bolt-on library choice.

---

## Syntax

```csharp
var builder = WebApplication.CreateBuilder(args);

// Registration
builder.Services.AddSingleton<ICacheService, MemoryCacheService>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddTransient<IEmailSender, SmtpEmailSender>();

var app = builder.Build();
```

```csharp
// Consumption via constructor injection
public class OrderService
{
    private readonly IOrderRepository _repository;
    private readonly IEmailSender _emailSender;

    public OrderService(IOrderRepository repository, IEmailSender emailSender)
    {
        _repository = repository;
        _emailSender = emailSender;
    }
}
```

---

## Syntax Variations

```csharp
// Registering a concrete instance
builder.Services.AddSingleton<IClock>(new SystemClock());

// Factory-based registration
builder.Services.AddScoped<IOrderRepository>(sp =>
{
    var connectionString = sp.GetRequiredService<IConfiguration>().GetConnectionString("Default");
    return new OrderRepository(connectionString!);
});

// Registering multiple implementations of the same interface
builder.Services.AddSingleton<INotifier, EmailNotifier>();
builder.Services.AddSingleton<INotifier, SmsNotifier>();
// Resolved as IEnumerable<INotifier> to get all of them

// Keyed services (.NET 8+)
builder.Services.AddKeyedSingleton<INotifier, EmailNotifier>("email");
builder.Services.AddKeyedSingleton<INotifier, SmsNotifier>("sms");

public class AlertService([FromKeyedServices("email")] INotifier notifier) { }

// Manual resolution (rarely needed directly)
var service = app.Services.GetRequiredService<IOrderRepository>();
```

---

## Examples

```csharp
public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(int id);
}

public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _context;
    public OrderRepository(AppDbContext context) => _context = context;

    public Task<Order?> GetByIdAsync(int id) => _context.Orders.FindAsync(id).AsTask();
}
```

```csharp
// Registering EF Core's DbContext (typically Scoped)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
```

```csharp
// Realistic usage: minimal API endpoint using constructor/parameter injection
app.MapGet("/orders/{id}", async (int id, IOrderRepository repo) =>
{
    var order = await repo.GetByIdAsync(id);
    return order is not null ? Results.Ok(order) : Results.NotFound();
});
```

```csharp
// Resolving all implementations of an interface
public class NotificationDispatcher
{
    private readonly IEnumerable<INotifier> _notifiers;
    public NotificationDispatcher(IEnumerable<INotifier> notifiers) => _notifiers = notifiers;

    public async Task NotifyAllAsync(string message)
    {
        foreach (var notifier in _notifiers)
            await notifier.SendAsync(message);
    }
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Built-in DI container | ⭐ `Microsoft.Extensions.DependencyInjection`, part of the standard hosting model | ❌ N/A — manual wiring or third-party libs | ⚠ Spring's `ApplicationContext`/CDI — framework-specific, not part of the JDK |
| Lifetime management | ⭐ Singleton, Scoped, Transient built in | ❌ N/A | ⚠ Spring beans: singleton, prototype, request, session (framework-specific) |
| Constructor injection | ⭐ Automatic based on constructor parameters | ❌ N/A | ✅ `@Autowired` constructor injection (Spring) |
| Resolving all implementations | ⭐ Inject `IEnumerable<IInterface>` directly | ❌ N/A | ⚠ `List<Bean>` autowiring (Spring), similar concept |
| Framework independence | ⭐ Works in console apps, workers, ASP.NET Core — same abstraction everywhere | ❌ N/A | ❌ DI is tied to a specific framework (Spring, Guice, Jakarta CDI) — no single JDK-wide standard |

---

## Common Patterns

```csharp
// Scoped for per-request state (e.g., EF Core DbContext)
builder.Services.AddScoped<AppDbContext>();

// Singleton for stateless, thread-safe, shared services
builder.Services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();

// Transient for lightweight, stateless, short-lived services
builder.Services.AddTransient<IValidator<Order>, OrderValidator>();
```

---

## Common Mistakes

### Coming from C

Manually threading dependencies (e.g., passing structs/function pointers through many layers of function calls) instead of registering services once and letting the container resolve the full dependency graph automatically at each constructor.

```csharp
// Manual wiring, error-prone as the graph grows
var repo = new OrderRepository(new AppDbContext(connectionString));
var service = new OrderService(repo, new SmtpEmailSender(smtpConfig));
```

Correct approach: register once, resolve automatically wherever needed.

```csharp
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddTransient<IEmailSender, SmtpEmailSender>();
// OrderService's constructor dependencies are now resolved automatically
```

### Coming from Java

Injecting a `Scoped` service (like `DbContext`) into a `Singleton` service, mirroring a common Spring anti-pattern of mismatched bean scopes — this throws an `InvalidOperationException` at runtime ("Cannot consume scoped service from singleton") because the singleton would otherwise capture a single scoped instance for the app's entire lifetime.

```csharp
// Throws at startup/first resolution — scope mismatch
builder.Services.AddSingleton<ReportGenerator>(); // depends on AppDbContext (Scoped)
```

Correct approach: match lifetimes — register the consuming service as `Scoped` or `Transient`, or inject `IServiceScopeFactory` to create a scope manually when a singleton genuinely needs scoped data.

```csharp
builder.Services.AddScoped<ReportGenerator>();
```

---

## Performance Notes

Resolving services from the container has a small overhead compared to `new`-ing objects directly, generally negligible except in extremely hot paths; `Singleton` services avoid repeated construction cost entirely. Overusing `Transient` for expensive-to-construct services multiplies allocation cost per resolution — prefer `Scoped`/`Singleton` for anything nontrivial to build.

---

## Related Features

See also:

* Configuration
* Interfaces
* Logging

---

## Best Practices

* Depend on interfaces/abstractions in constructors, not concrete types, to keep services testable and swappable.
* Match lifetimes carefully — never inject a `Scoped` service into a `Singleton`.
* Prefer constructor injection; avoid the service locator pattern (`GetRequiredService` scattered through business logic).
* Use `AddDbContext` (which registers `Scoped` by default) for EF Core rather than managing its lifetime manually.

---

## Common APIs

IServiceCollection

IServiceProvider

ServiceLifetime

IServiceScopeFactory

---

## Notes

Constructor injection is resolved once per requested service instance; ASP.NET Core creates one DI scope per HTTP request by default, which is why `Scoped` services (like `DbContext`) behave as "per-request" instances in web applications.

---

## Official Documentation

* [Dependency injection in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)
* [Dependency injection guidelines](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines)
