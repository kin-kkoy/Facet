# Exceptions

Exception handling, custom exceptions, and exception filters.

---

## Quick Summary

C# exceptions are all unchecked — there is no `throws` declaration or compiler-enforced catch requirement, unlike Java's checked exceptions. `try`/`catch`/`finally` syntax is familiar from Java/C++, with the addition of `when` exception filters unique to C#. All exceptions derive from `System.Exception`.

---

## Syntax

```csharp
try
{
    // risky code
}
catch (SpecificException ex)
{
    // handle
}
catch (Exception ex)
{
    // handle general case
}
finally
{
    // always runs
}

throw new InvalidOperationException("message");
```

---

## Syntax Variations

```csharp
// Exception filter (C# 6+) — catch only if the 'when' condition is true
try
{
    CallApi();
}
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
{
    // handle 404 specifically
}
catch (HttpRequestException ex)
{
    // handle other HTTP errors
}

// Rethrow preserving original stack trace
try { Risky(); }
catch (Exception ex)
{
    Log(ex);
    throw; // NOT 'throw ex;' — that resets the stack trace
}

// Custom exception
public class InsufficientFundsException : Exception
{
    public InsufficientFundsException(string message) : base(message) { }
}
```

---

## Examples

```csharp
// Custom exception with additional data
public class OrderNotFoundException : Exception
{
    public int OrderId { get; }

    public OrderNotFoundException(int orderId)
        : base($"Order {orderId} was not found.")
    {
        OrderId = orderId;
    }
}

throw new OrderNotFoundException(42);
```

```csharp
// finally guarantees cleanup even if an exception propagates
FileStream? stream = null;
try
{
    stream = File.OpenRead("data.bin");
    Process(stream);
}
finally
{
    stream?.Dispose();
}
// Prefer 'using' over manual try/finally when possible (see Scope, Files)
```

```csharp
// Exception filters avoid catch-rethrow patterns for conditional handling
try
{
    DoWork();
}
catch (Exception ex) when (ShouldLog(ex))
{
    Log(ex);
    throw;
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Checked vs unchecked | ⭐ All unchecked — no `throws` declarations | ❌ N/A — no exceptions (error codes/`errno`/`setjmp`/`longjmp`) | ❌ Different — checked exceptions require `throws` or a catch |
| Exception filters (`when`) | ⭐ C# only | ❌ N/A | ❌ Not available |
| `finally` | ✅ Same | ❌ N/A (manual cleanup only) | ✅ Same |
| Multi-catch | ⚠ Similar — separate `catch` blocks per type | ❌ N/A | ⚠ Similar — supports `catch (A \| B ex)` multi-type catch |
| Base exception type | `System.Exception` | N/A | `java.lang.Throwable` |
| Rethrow preserving stack trace | `throw;` | N/A | `throw;` equivalent is `throw ex;` (Java preserves trace by default) |

---

## Common Patterns

- Use exception filters (`when`) instead of catching broadly and re-throwing based on an `if` inside the catch block.
- Reserve custom exceptions for domain-meaningful error conditions callers are expected to catch specifically; use built-in exceptions (`ArgumentException`, `InvalidOperationException`) for generic programming errors.
- Prefer `using`/`using var` over manual `try`/`finally` for `IDisposable` cleanup.

---

## Common Mistakes

### Coming from C

Trying to use return codes or `errno`-style patterns for error handling instead of exceptions. Idiomatic C# uses exceptions for exceptional conditions and `Try*`-pattern methods (returning `bool` + `out` parameter) for expected failure paths, not manual error codes.

### Coming from Java

Expecting the compiler to enforce catching or declaring exceptions (`throws IOException`). C# has no checked exceptions — any method can throw any exception without declaring it, so documentation (XML doc comments) is the only way to communicate what a method might throw.

```csharp
// No 'throws' clause needed or possible in C#
/// <exception cref="InvalidOperationException">Thrown when the connection is closed.</exception>
void Send(string data) { /* ... */ }
```

---

## Performance Notes

- Throwing exceptions is relatively expensive (stack unwinding, stack trace capture) — avoid using exceptions for routine control flow; prefer `Try*` patterns or nullable returns for expected failure cases.
- `finally` blocks always execute, even during exception propagation, but add negligible overhead in the non-throwing path.

---

## Related Features

See also:
- Methods
- Scope
- Control Flow

---

## Best Practices

- Catch the most specific exception type you can meaningfully handle; avoid bare `catch (Exception)` except at top-level boundaries (e.g., logging middleware).
- Always use `throw;` (not `throw ex;`) to preserve the original stack trace when rethrowing.
- Design public APIs around `Try*` methods for expected failure paths, reserving exceptions for truly exceptional conditions.

---

## Common APIs

- `System.Exception`
- `ArgumentException`, `ArgumentNullException`
- `InvalidOperationException`
- `AggregateException` (for parallel/async scenarios)

---

## Notes

Since exceptions are unchecked, static analyzers (e.g., Roslyn analyzers) and XML doc `<exception>` tags are the practical substitute for Java's compiler-enforced `throws` contract.

---

## Official Documentation

- [Exceptions and exception handling](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/exceptions/)
- [Exception-filter using the when keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/exception-filters)
- [Creating and throwing exceptions](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/how-to-create-user-defined-exceptions)
