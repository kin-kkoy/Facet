# Events

Encapsulated publish/subscribe mechanism built on delegates.

---

## Quick Summary

An event is a member that wraps a delegate field, restricting external code to only `+=`/`-=` (subscribe/unsubscribe) while the declaring class retains exclusive rights to invoke it. Events are the idiomatic .NET pattern for notifications, replacing raw public delegate fields to prevent external code from overwriting or directly invoking the delegate.

---

## Syntax

```csharp
public class Button
{
    public event EventHandler? Clicked;

    public void SimulateClick() =>
        Clicked?.Invoke(this, EventArgs.Empty);
}

// Subscribing
var button = new Button();
button.Clicked += (sender, e) => Console.WriteLine("Clicked!");
```

---

## Syntax Variations

```csharp
// Custom EventArgs
public class OrderPlacedEventArgs : EventArgs
{
    public int OrderId { get; }
    public OrderPlacedEventArgs(int orderId) => OrderId = orderId;
}

public class OrderService
{
    public event EventHandler<OrderPlacedEventArgs>? OrderPlaced;

    public void PlaceOrder(int id) =>
        OrderPlaced?.Invoke(this, new OrderPlacedEventArgs(id));
}

// Custom delegate type instead of EventHandler
public delegate void PriceChangedHandler(decimal oldPrice, decimal newPrice);

public class Stock
{
    public event PriceChangedHandler? PriceChanged;
}

// Explicit add/remove accessors (rarely needed)
private EventHandler? _clicked;
public event EventHandler? Clicked
{
    add => _clicked += value;
    remove => _clicked -= value;
}
```

---

## Examples

```csharp
public class Timer
{
    public event EventHandler? Elapsed;

    public void Start()
    {
        // simulate elapsed time
        Elapsed?.Invoke(this, EventArgs.Empty);
    }
}

var timer = new Timer();
timer.Elapsed += (s, e) => Console.WriteLine("Tick!");
timer.Start();
```

```csharp
// Unsubscribing to avoid memory leaks
void Handler(object? sender, EventArgs e) => Console.WriteLine("Handled");

timer.Elapsed += Handler;
timer.Elapsed -= Handler;
```

```csharp
// Realistic usage: view-model style property change notification
public class UserViewModel : INotifyPropertyChanged
{
    private string _name = "";
    public event PropertyChangedEventHandler? PropertyChanged;

    public string Name
    {
        get => _name;
        set
        {
            if (_name == value) return;
            _name = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Name)));
        }
    }
}
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Publish/subscribe | ⭐ `event` keyword restricts external invocation to subscribe/unsubscribe only | ❌ N/A — manual callback registries | ⚠ Listener interfaces + manual `addListener`/`removeListener` methods |
| Multiple subscribers | ⭐ Built-in multicast via `+=` | ❌ Manual array/list of function pointers | ⚠ Manual `List<Listener>` |
| Encapsulation | ⭐ External code cannot invoke or overwrite the event, only the declaring class can | ❌ N/A | ✅ Achieved via interface design, but requires more boilerplate |
| Standard convention | ⭐ `EventHandler`/`EventHandler<TEventArgs>` with `(sender, args)` shape | ❌ N/A | ⚠ No single standard; ad hoc listener interfaces |

---

## Common Patterns

```csharp
// Standard .NET event signature
public event EventHandler<TEventArgs>? SomethingHappened;

// Null-conditional invoke — the idiomatic thread-safe-ish pattern
SomethingHappened?.Invoke(this, args);

// INotifyPropertyChanged for data binding (WPF, MAUI, Blazor)
public event PropertyChangedEventHandler? PropertyChanged;
```

---

## Common Mistakes

### Coming from C

Trying to expose the underlying delegate field as public and call it directly from outside the class, expecting C-style function pointer access.

```csharp
// Doesn't compile — events can't be invoked or assigned externally
button.Clicked(this, EventArgs.Empty); // error outside declaring class
button.Clicked = someHandler;          // error: can't assign, only += / -=
```

Correct approach: only the declaring class invokes the event; external code may only subscribe.

```csharp
button.Clicked += someHandler; // OK
```

### Coming from Java

Defining a full listener interface (`OnClickListener`) and manual `addListener`/`removeListener` methods out of habit, rather than using the built-in `event` keyword.

```csharp
// Java-style listener interface — verbose in C#
public interface IClickListener { void OnClick(object sender); }
private List<IClickListener> _listeners = new();
public void AddListener(IClickListener l) => _listeners.Add(l);
```

Correct approach: use `event EventHandler` and let the language handle registration.

```csharp
public event EventHandler? Clicked;
```

---

## Performance Notes

Each `+=` on a multicast event allocates a new delegate combining the previous invocation list with the new handler (delegates are immutable), so extremely high-frequency subscribe/unsubscribe cycles have allocation overhead. Invocation itself iterates the list sequentially with minimal overhead.

---

## Related Features

See also:

* Delegates
* Lambdas
* Properties

---

## Best Practices

* Always use the `event` keyword rather than a public delegate field.
* Always invoke with `?.Invoke(...)` to guard against no subscribers.
* Follow the `EventHandler<TEventArgs>` convention with `(object? sender, TEventArgs e)` for consistency with the .NET ecosystem.
* Unsubscribe handlers (`-=`) when the subscriber's lifetime is shorter than the publisher's, to avoid memory leaks.

---

## Common APIs

EventHandler

EventHandler\<TEventArgs\>

EventArgs

INotifyPropertyChanged

---

## Notes

Events subscribed across long-lived publishers are a common source of memory leaks in .NET — the publisher holds a reference to the subscriber via the delegate's invocation list, keeping it alive.

---

## Official Documentation

* [Events](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/events/)
* [EventHandler<TEventArgs>](https://learn.microsoft.com/en-us/dotnet/api/system.eventhandler-1)
