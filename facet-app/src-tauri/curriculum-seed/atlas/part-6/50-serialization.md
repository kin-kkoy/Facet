# Serialization

Converting objects to and from JSON, XML, or binary representations.

---

## Quick Summary

.NET's primary modern serialization API is `System.Text.Json`, a high-performance, built-in JSON serializer that replaced `Newtonsoft.Json` (Json.NET) as the default recommendation, though Json.NET remains widely used for its more flexible (but slower) feature set. XML serialization is handled by `System.Xml.Serialization`. Serialization is attribute-driven and reflection-based by default, with source-generator-based options available for performance-critical or trimming/AOT scenarios.

---

## Syntax

```csharp
using System.Text.Json;

// Serialize
var person = new Person("Alice", 30);
string json = JsonSerializer.Serialize(person);

// Deserialize
Person? deserialized = JsonSerializer.Deserialize<Person>(json);

record Person(string Name, int Age);
```

---

## Syntax Variations

```csharp
// Serialization options
var options = new JsonSerializerOptions
{
    WriteIndented = true,
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
};
string json = JsonSerializer.Serialize(person, options);

// Attributes controlling serialization
public class Product
{
    [JsonPropertyName("product_name")]
    public string Name { get; set; } = "";

    [JsonIgnore]
    public string InternalNotes { get; set; } = "";
}

// Async stream-based serialization
await JsonSerializer.SerializeAsync(fileStream, person);
var result = await JsonSerializer.DeserializeAsync<Person>(fileStream);

// Source-generated serialization (AOT/trimming-friendly, faster)
[JsonSerializable(typeof(Person))]
public partial class AppJsonContext : JsonSerializerContext { }

string json2 = JsonSerializer.Serialize(person, AppJsonContext.Default.Person);
```

---

## Examples

```csharp
record Order(int Id, decimal Total, List<string> Items);

var order = new Order(1, 99.99m, new List<string> { "Widget", "Gadget" });
string json = JsonSerializer.Serialize(order, new JsonSerializerOptions { WriteIndented = true });
Console.WriteLine(json);
```

```csharp
// Deserializing from a file
string json = await File.ReadAllTextAsync("order.json");
Order? order = JsonSerializer.Deserialize<Order>(json);
```

```csharp
// Realistic usage: API response deserialization with custom options
var options = new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = true,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};

using var response = await httpClient.GetAsync("/api/orders/1");
var order = await response.Content.ReadFromJsonAsync<Order>(options);
```

```csharp
// XML serialization
using System.Xml.Serialization;

var serializer = new XmlSerializer(typeof(Order));
using var writer = new StreamWriter("order.xml");
serializer.Serialize(writer, order);
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Built-in JSON serializer | ⭐ `System.Text.Json` (in the BCL, no extra package) | ❌ N/A — requires a third-party library (e.g., cJSON) | ⚠ No built-in equivalent; Jackson/Gson are de facto standards (external) |
| Attribute-based control | ⭐ `[JsonPropertyName]`, `[JsonIgnore]` | ❌ N/A | ⚠ `@JsonProperty`, `@JsonIgnore` (Jackson) |
| AOT/reflection-free serialization | ⭐ Source-generated `JsonSerializerContext` | ❌ N/A | ⚠ Limited; most Java JSON libs rely on reflection |
| XML serialization | ⭐ `System.Xml.Serialization` built in | ⚠ Third-party (libxml2, etc.) | ✅ JAXB built into older JDKs (removed from JDK 11+, now external) |

---

## Common Patterns

```csharp
// Ignoring null values when serializing
var options = new JsonSerializerOptions
{
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};

// Polymorphic serialization (C# 9+ records with a discriminator)
[JsonDerivedType(typeof(Circle), "circle")]
[JsonDerivedType(typeof(Square), "square")]
abstract record Shape;
record Circle(double Radius) : Shape;
record Square(double Side) : Shape;
```

---

## Common Mistakes

### Coming from C

Expecting to manually write custom parsing/formatting code for JSON structures (as one would hand-roll a parser in C), rather than leveraging attribute-driven automatic (de)serialization built into the framework.

```csharp
// Unnecessary manual parsing when a built-in serializer exists
string manualJson = "{\"name\":\"" + person.Name + "\",\"age\":" + person.Age + "}";
```

Correct approach: use `JsonSerializer.Serialize`.

```csharp
string json = JsonSerializer.Serialize(person);
```

### Coming from Java

Defaulting to adding a third-party library (mirroring Jackson/Gson habits) before checking whether `System.Text.Json` — already included in the BCL with no extra NuGet package — meets the need.

```csharp
// Unnecessary additional dependency for standard JSON needs
// (Newtonsoft.Json) — still valid, but often unneeded for new projects
```

Correct approach: default to `System.Text.Json` first; reach for Newtonsoft.Json only when its extra features (e.g., `JsonConverter` ecosystem breadth, `LINQ to JSON`) are specifically needed.

```csharp
string json = JsonSerializer.Serialize(person);
```

---

## Performance Notes

`System.Text.Json` is built on `Utf8JsonReader`/`Utf8JsonWriter`, operating directly on UTF-8 bytes without intermediate string allocations, making it significantly faster and more memory-efficient than Newtonsoft.Json for most workloads. Source-generated serialization (`JsonSerializerContext`) eliminates reflection entirely, improving startup time and enabling full trimming/Native AOT compatibility. Reusing a single `JsonSerializerOptions` instance (rather than constructing one per call) avoids repeated internal caching overhead.

---

## Related Features

See also:

* File I/O
* Records
* Generics

---

## Best Practices

* Default to `System.Text.Json` for new projects; reach for Newtonsoft.Json only for specific missing features.
* Reuse `JsonSerializerOptions` instances rather than creating new ones per call.
* Use source-generated contexts (`JsonSerializerContext`) for AOT/trimming scenarios or performance-critical paths.
* Use `ReadFromJsonAsync`/`WriteAsJsonAsync` extension methods with `HttpClient` for concise API integration code.

---

## Common APIs

JsonSerializer

JsonSerializerOptions

JsonPropertyNameAttribute

JsonSerializerContext

XmlSerializer

---

## Notes

`System.Text.Json` deserializes into `record` types seamlessly as long as constructor parameter names match JSON property names (case-insensitively, if configured) — no parameterless constructor is required, unlike many older serializers.

---

## Official Documentation

* [System.Text.Json overview](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/overview)
* [How to use source generation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation)
