# LINQ

Language-Integrated Query — a unified query syntax over in-memory collections, databases, XML, and more.

---

## Quick Summary

LINQ (Language-Integrated Query) provides a consistent set of query operators — `Where`, `Select`, `OrderBy`, `GroupBy`, `Join`, and dozens more — implemented as extension methods on `IEnumerable<T>` (LINQ to Objects) and `IQueryable<T>` (LINQ to Entities/SQL, via expression trees). C# also offers dedicated query syntax (`from ... where ... select`) that the compiler translates into the equivalent method chain.

---

## Syntax

```csharp
// Method syntax
var adults = people.Where(p => p.Age >= 18).OrderBy(p => p.Name).ToList();

// Query syntax
var adults2 =
    from p in people
    where p.Age >= 18
    orderby p.Name
    select p;
```

---

## Syntax Variations

```csharp
// Projection
var names = people.Select(p => p.Name);

// Grouping
var byCity = people.GroupBy(p => p.City);

// Join
var query =
    from o in orders
    join c in customers on o.CustomerId equals c.Id
    select new { o.OrderId, c.Name };

// Aggregate operators
int total = numbers.Sum();
double avg = numbers.Average();
int max = numbers.Max();
bool any = numbers.Any(n => n > 100);

// Deferred vs immediate execution
IEnumerable<int> deferred = numbers.Where(n => n > 0); // not executed yet
List<int> immediate = deferred.ToList();               // executes now
```

---

## Examples

```csharp
var products = new List<Product>
{
    new("Laptop", 1200, "Electronics"),
    new("Desk", 300, "Furniture"),
    new("Phone", 800, "Electronics"),
};

var electronics = products
    .Where(p => p.Category == "Electronics")
    .OrderByDescending(p => p.Price)
    .Select(p => p.Name)
    .ToList();
// ["Laptop", "Phone"]
```

```csharp
// Grouping and aggregation
var totalsByCategory = products
    .GroupBy(p => p.Category)
    .Select(g => new { Category = g.Key, Total = g.Sum(p => p.Price) });
```

```csharp
// Realistic usage: LINQ to Entities (EF Core) — translated to SQL
var recentOrders = await dbContext.Orders
    .Where(o => o.CreatedAt > DateTime.UtcNow.AddDays(-7))
    .Include(o => o.Customer)
    .OrderByDescending(o => o.CreatedAt)
    .ToListAsync();
```

```csharp
// Combining multiple operators in a pipeline
var report = employees
    .Where(e => e.IsActive)
    .GroupBy(e => e.Department)
    .Select(g => new
    {
        Department = g.Key,
        Count = g.Count(),
        AvgSalary = g.Average(e => e.Salary)
    })
    .OrderByDescending(x => x.AvgSalary);
```

---

## Comparison

| Aspect | C# | C | Java |
|---|---|---|---|
| Declarative query over collections | ⭐ LINQ (`Where`, `Select`, `GroupBy`, `Join`, query syntax) | ❌ N/A — manual loops | ⚠ Stream API (`stream().filter().map()`) |
| Deferred execution | ⭐ `IEnumerable<T>` queries are lazily evaluated until enumerated | ❌ N/A | ⚠ Streams are lazy but single-use (cannot be re-enumerated) |
| Database query translation | ⭐ `IQueryable<T>` + expression trees translate to SQL (EF Core) | ❌ N/A | ⚠ No built-in equivalent; JPA Criteria API is more verbose |
| Re-enumerable queries | ⭐ `IEnumerable<T>` can be enumerated multiple times (re-executes) | ❌ N/A | ❌ Java Streams throw `IllegalStateException` if reused |
| Built-in query syntax (SQL-like) | ⭐ `from x in y where ... select` | ❌ N/A | ❌ N/A — only method chains |

---

## Common Patterns

```csharp
// First/FirstOrDefault for single-item lookups
var user = users.FirstOrDefault(u => u.Id == id);

// Any/All for existence checks
bool hasAdmins = users.Any(u => u.IsAdmin);

// ToDictionary for fast lookups
var lookup = users.ToDictionary(u => u.Id);

// Chained fluent pipelines
var result = source.Where(...).Select(...).OrderBy(...).ToList();
```

---

## Common Mistakes

### Coming from C

Writing manual `for` loops with accumulator variables for filtering/mapping/aggregation instead of using declarative LINQ operators, missing the readability and composability benefits.

```csharp
// C-style manual loop
var result = new List<int>();
foreach (var n in numbers)
{
    if (n % 2 == 0) result.Add(n * n);
}
```

Correct approach:

```csharp
var result = numbers.Where(n => n % 2 == 0).Select(n => n * n).ToList();
```

### Coming from Java

Treating a LINQ query like a Java `Stream` — assuming it can only be enumerated once, or forgetting that `IEnumerable<T>` queries are deferred and re-execute on each enumeration (which can cause redundant work or inconsistent results if the underlying data changes between enumerations).

```csharp
var query = numbers.Where(n => n > 0); // not yet executed
Console.WriteLine(query.Count());      // executes once
Console.WriteLine(query.First());      // executes AGAIN, not reusing prior result
```

Correct approach: materialize with `.ToList()`/`.ToArray()` once if you intend to reuse or avoid re-computation.

```csharp
var materialized = numbers.Where(n => n > 0).ToList();
```

---

## Performance Notes

LINQ to Objects has per-call overhead from delegate invocation and iterator state machines compared to a hand-written loop — usually negligible, but relevant in hot paths. Deferred execution means a query re-runs its entire pipeline every time it's enumerated; cache results with `.ToList()` when reused. `IQueryable<T>` providers (EF Core) translate expression trees to SQL at execution time — avoid client-side evaluation surprises by keeping predicates translatable (e.g., don't call arbitrary C# methods the provider can't translate).

---

## Related Features

See also:

* Lambdas
* Delegates
* Generics
* Iterators

---

## Best Practices

* Prefer method syntax for most cases; use query syntax mainly for multi-table `join`s where it reads more naturally.
* Materialize (`.ToList()`/`.ToArray()`) query results you intend to enumerate more than once.
* Avoid `.Count()` for existence checks — use `.Any()`, which short-circuits.
* With EF Core, keep predicates translatable to SQL; project only needed columns with `.Select()` to avoid over-fetching.

---

## Common APIs

Enumerable

Queryable

IEnumerable\<T\>

IQueryable\<T\>

List\<T\>

Dictionary\<TKey,TValue\>

---

## Notes

LINQ to Objects operates on `IEnumerable<T>` and executes in-process; LINQ to Entities operates on `IQueryable<T>` and builds expression trees translated by the provider (e.g., to SQL) — mixing the two by calling non-translatable methods inside an `IQueryable` pipeline can silently force client-side evaluation or throw at runtime, depending on the provider.

---

## Official Documentation

* [LINQ overview](https://learn.microsoft.com/en-us/dotnet/csharp/linq/)
* [Standard query operators overview](https://learn.microsoft.com/en-us/dotnet/csharp/linq/standard-query-operators/)
