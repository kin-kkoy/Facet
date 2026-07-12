# ASP.NET Core

This is where C# starts paying your rent: **ASP.NET Core** is the framework for building web APIs
and services on .NET. You already know the language; here you learn the *shape* of a web app — how
a request comes in, flows through a pipeline, and produces a response. Nothing here needs front-end
knowledge; an API just speaks JSON over HTTP.

---

## 1. A whole API in one file (minimal APIs)

Modern ASP.NET lets you stand up a real endpoint with almost no ceremony:

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/hello/{name}", (string name) => new { message = $"Hello, {name}!" });
app.MapPost("/echo", (Message m) => Results.Ok(m));

app.Run();

record Message(string Text);
```

Run it and `GET /hello/Ada` returns `{"message":"Hello, Ada!"}` as JSON — serialization is automatic.
`MapGet`/`MapPost`/`MapPut`/`MapDelete` register endpoints; the lambda's parameters are **bound** from
the route, query string, or JSON body (next section). `Results.Ok(...)`, `Results.NotFound()`,
`Results.BadRequest(...)` produce the right HTTP status. **Mental model:** an API is just a set of
functions the framework calls when a matching URL arrives.

> **Try it (lab):** sketch three endpoints on paper for a to-do API — `GET /todos`, `GET /todos/{id}`,
> `POST /todos` — and write the `MapGet`/`MapPost` signatures (parameter types + return). You'll build
> the bodies once EF Core is in.

---

## 2. The request pipeline & middleware

Every request flows through an ordered chain of **middleware** — small components that each get a
crack at the request on the way in and the response on the way out (like layers of an onion):

```csharp
app.UseHttpsRedirection();     // order matters — each runs in sequence
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();          // endpoints run at the "center" of the onion
```

Cross-cutting concerns — logging, error handling, auth, CORS — are middleware. **The order is the
behaviour:** authentication must run before authorization; your exception handler must be near the
outside to catch everything inside it. A custom one is just a function:

```csharp
app.Use(async (context, next) =>
{
    var sw = System.Diagnostics.Stopwatch.StartNew();
    await next();                          // call the rest of the pipeline
    app.Logger.LogInformation("{Method} {Path} took {Ms}ms",
        context.Request.Method, context.Request.Path, sw.ElapsedMilliseconds);
});
```

> **Try it (lab):** write the timing middleware above and hit any endpoint — watch the log line. Then
> move `UseAuthorization` before `UseAuthentication` and reason about why that would break.

---

## 3. Dependency Injection (learn this deeply)

DI is the backbone of every .NET app, so treat it as a first-class topic, not a footnote. The idea:
a class **declares what it needs in its constructor**, and the framework **supplies** it. You never
`new` up your dependencies; you ask for the *interface* and the container provides an implementation.

```csharp
interface IClock { DateTime Now { get; } }
class SystemClock : IClock { public DateTime Now => DateTime.UtcNow; }

class GreetingService(IClock clock)                       // asks for IClock; doesn't create it
{
    public string Greet(string name) => $"Hi {name}, it's {clock.Now:t}";
}

// register once, at startup:
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddScoped<GreetingService>();
```

**Service lifetimes — the part people get wrong:**

| Lifetime | One instance per… | Use for |
|---|---|---|
| `AddSingleton` | the whole app | stateless/shared services, caches, config |
| `AddScoped` | one HTTP request | anything touching the database (EF `DbContext`) |
| `AddTransient` | every injection | cheap, stateless helpers |

**The classic bug (captive dependency):** injecting a `Scoped` service (like a `DbContext`) into a
`Singleton` — the singleton captures one request's scoped object forever. Match lifetimes carefully.

**Why it matters:** DI is what makes code *testable* (swap `IClock` for a fake in a unit test) and
*swappable* (change `SystemClock` to `NtpClock` in one line). This is abstraction (from the OOP
chapter) turned into an architecture.

> **Try it (lab):** register `IClock`/`SystemClock`, inject it into an endpoint, and return the time.
> Then write a `FakeClock` returning a fixed time and imagine the unit test — that swap is the payoff.

*(Atlas: **Dependency Injection**.)*

---

## 4. Binding, DTOs & validation

The framework **binds** incoming data to your parameters: route values, query string, and JSON body.
Never expose your database entities directly — accept a **DTO** (data transfer object) that describes
exactly the shape the client may send, and **validate** it:

```csharp
using System.ComponentModel.DataAnnotations;

record CreateTodo([Required, StringLength(120)] string Title, DateOnly? Due);

app.MapPost("/todos", (CreateTodo dto) =>
{
    // model binding filled `dto` from the JSON body; validation attributes are checked
    return Results.Created($"/todos/{1}", dto);
});
```

DTOs are a **security and stability boundary**: a client can't set fields you didn't put on the DTO
(no over-posting an `IsAdmin` flag), and your internal model can change without breaking the API
contract. Validation attributes (`[Required]`, `[Range]`, `[EmailAddress]`, `[StringLength]`) or a
library like FluentValidation reject bad input before your logic runs.

> **Try it (lab):** define a `CreateTodo` DTO with `[Required]` on `Title`, POST it with an empty
> title, and observe the 400 with validation details — before any of your code runs.

---

## 5. Consistent errors, config, logging, OpenAPI

- **ProblemDetails** — return errors in the standard RFC 7807 JSON shape (`Results.Problem(...)`), so
  every client parses failures the same way. Add a global exception handler as outer middleware.
- **Configuration** — settings come from `appsettings.json`, environment variables, and user-secrets,
  merged by precedence; read them via `IConfiguration` or bind a strongly-typed options class.
- **Logging** — inject `ILogger<T>` and log *structured* messages (`LogInformation("...{OrderId}", id)`)
  — searchable, not string-concatenated.
- **OpenAPI/Swagger** — auto-generates interactive API docs from your endpoints; invaluable for
  testing and for anyone consuming your API.

*(Atlas: **Configuration**, **Logging**.)*

---

## Performance notes

- **Async all the way** (from the Async chapter): web handlers should be `async Task<...>` and await
  I/O, so a thread isn't parked per in-flight request. This is *the* scalability lever for an API.
- **Prefer `Scoped` for per-request state, `Singleton` for shared** — creating heavy objects per
  request (or accidentally per injection with `Transient`) adds up under load.
- **Return `IResult`/typed results**, and page large lists (`Skip`/`Take`) — never serialize a
  10,000-row table into one response.

## Build it (make the chapter real)

Build the skeleton of a **to-do API** (you'll give it a real database next chapter):

1. `GET /todos`, `GET /todos/{id}`, `POST /todos`, `DELETE /todos/{id}` as minimal-API endpoints.
2. A `CreateTodo` DTO with validation; return `400` on bad input and `201 Created` on success.
3. A `GreetingService`-style class injected via DI (start with an in-memory `List<Todo>` store
   registered as a `Singleton`).
4. Timing + exception middleware, and Swagger enabled.

Success test: hit every endpoint from Swagger, get correct status codes, and see your timing log
lines. You've built a real web service — the thing that gets people hired.
