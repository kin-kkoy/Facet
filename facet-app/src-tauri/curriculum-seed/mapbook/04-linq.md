# LINQ

LINQ (Language-Integrated Query) is a set of query operators — `Where`, `Select`, `OrderBy`,
`GroupBy`, `Join` — that read like SQL but work on **any** sequence: in-memory lists, database
tables (via EF Core), XML. Learn it once, use it everywhere. It's one of the biggest reasons C# is
nicer than Java for day-to-day data work, and it shows up in every interview.

---

## 1. The foundation: delegates, lambdas, events

You can't understand LINQ without these, and C has nothing like them (Java's are clunkier), so
they're worth real space.

### Delegates — a type-safe function pointer
A **delegate** is a *type whose values are methods*. The built-ins you'll use are `Func<...>`
(returns a value) and `Action<...>` (returns void):

```csharp
System.Func<int, int>    square = x => x * x;        // takes int, returns int
System.Func<int, int, int> add  = (a, b) => a + b;   // two args
System.Action<string>    log    = s => System.Console.WriteLine(s);

System.Console.WriteLine(square(5));   // 25
log("hi");
```

### Lambdas — inline methods
A **lambda** (`x => x * x`) is a compact anonymous method. It's the argument you hand a LINQ
operator to say *how* to filter/transform. `x => x * x` reads "given x, produce x*x."

### Events — publish/subscribe
An **event** is a delegate a class exposes so others can subscribe (`+=`) and be called back when
something happens (buttons, timers, "item added"):

```csharp
class Cart
{
    public event System.Action<decimal>? Changed;             // publisher declares it
    private decimal _total;
    public void Add(decimal price) { _total += price; Changed?.Invoke(_total); }
}

var cart = new Cart();
cart.Changed += t => System.Console.WriteLine($"total is now {t}");   // subscriber
cart.Add(9.99m);   // fires the event → prints
```

**Use-case:** events decouple "something happened" from "who cares" — the cart doesn't know who's
listening. That's the same decoupling as abstraction, but over time instead of over types.

> **Try it (lab):** store three lambdas in a `List<Func<int,int>>` (square, negate, +10) and apply
> each to `5` in a loop. Then wire an event: a `Timer`-like class that raises `Tick` and two
> subscribers that print different things.

*(Atlas: **Lambdas**, **Delegates**, **Events**, **Extension Methods**.)*

---

## 2. The core operators

LINQ methods are **extension methods** on `IEnumerable<T>`, so you chain them with `.`:

```csharp
int[] nums = { 5, 2, 8, 1, 9, 3, 7 };

var topThreeOdds = nums.Where(n => n % 2 == 1)      // filter
                       .OrderByDescending(n => n)   // sort
                       .Take(3)                     // limit
                       .ToList();                   // → [9, 7, 5]

var total = nums.Where(n => n > 4).Sum();           // aggregate → 29
bool anyBig = nums.Any(n => n > 8);                 // true
```

Memorise these: `Where` (filter), `Select` (map/transform), `OrderBy`/`OrderByDescending`,
`First`/`FirstOrDefault`/`Single`, `Any`/`All`, `Count`, `Sum`/`Max`/`Min`/`Average`, `Take`/`Skip`,
`Distinct`, `ToList`/`ToArray`/`ToDictionary`.

### The three that unlock real reporting

```csharp
record Order(int CustomerId, decimal Amount);
Order[] orders = { new(1, 10), new(1, 25), new(2, 5) };

// GroupBy — bucket by a key:
var perCustomer = orders.GroupBy(o => o.CustomerId)
                        .Select(g => new { Customer = g.Key, Total = g.Sum(o => o.Amount) });
// → { Customer=1, Total=35 }, { Customer=2, Total=5 }

// Join — combine two sequences on a matching key (a SQL join):
record Customer(int Id, string Name);
Customer[] customers = { new(1, "Ada"), new(2, "Linus") };
var named = orders.Join(customers, o => o.CustomerId, c => c.Id,
                        (o, c) => new { c.Name, o.Amount });

// SelectMany — flatten sequence-of-sequences into one:
string[][] groups = { new[] { "a", "b" }, new[] { "c" } };
var flat = groups.SelectMany(g => g);   // "a","b","c"
```

There's also a SQL-like **query syntax** (`from o in orders where o.Amount > 8 select o`) the
compiler translates to these same methods — use whichever reads better for the query.

> **Try it (lab):** from a `List<Order>`, produce the top 3 customers by total spend using `GroupBy`
> + `Select` + `OrderByDescending` + `Take`. Then rewrite one query in query syntax.

*(Atlas: **LINQ**.)*

---

## 3. The interview trap: deferred execution

A LINQ chain **doesn't run when you write it** — it runs when you *iterate* it (`foreach`, `ToList`,
`Count`, `First`…). This is the #1 LINQ interview question and the #1 real-world surprise.

```csharp
var q = nums.Where(n => { System.Console.WriteLine($"testing {n}"); return n > 4; });
// nothing printed yet — the query is just a recipe

var list = q.ToList();   // NOW it runs, printing each "testing n"

// And it RE-RUNS every time you enumerate:
var evens = nums.Where(n => n % 2 == 0);
int c1 = evens.Count();   // enumerates the source once
int c2 = evens.Count();   // enumerates it AGAIN
```

Rules you can live by:

- Call **`ToList()` / `ToArray()`** to *materialise* — run once and snapshot — when you'll use the
  result more than once, or when the underlying data might change before you read it.
- **Don't** materialise in the middle of a pipeline you're about to filter further; that throws away
  the laziness (and, with EF Core, pulls the whole table into memory instead of filtering in SQL).
- With a **database** (EF Core), the query isn't SQL until you enumerate — so `.Where(...)` stays on
  the server, but `.ToList().Where(...)` drags everything to the client first. Materialise *late*.

> **Try it (lab):** build a `Where` query whose lambda prints each element it tests. Enumerate it
> twice and count the prints — see it re-run. Then insert a `.ToList()` and watch the double
> enumeration disappear.

---

## Performance notes

- **`Count()` vs `Any()`:** to check "is there at least one?", use `Any()` — it stops at the first
  match. `Count() > 0` walks the whole sequence.
- **Materialise once, reuse:** repeatedly enumerating a deferred query re-does all the work (and
  re-hits the database). One `ToList()` beats three re-runs.
- **`First()`/`FirstOrDefault()` short-circuit** — they stop at the first hit, unlike `Where(...).ToList()[0]`.
- **LINQ has overhead** (delegates, iterators). Wonderful for clarity; in a genuinely hot numeric
  inner loop a plain `for` can be faster. Optimise only when a profiler says so — clarity first.

## Build it (make the chapter real)

Take a CSV (or the word list from earlier), model a row as a `record`, then answer three **report**
questions with LINQ:

1. a filtered **top-N** (e.g. the 5 biggest orders),
2. a **`GroupBy`** aggregate (total per category/customer),
3. a **`Join`** against a small lookup table (attach names to ids).

Then deliberately trigger the **double-enumeration** bug (enumerate a deferred query twice with a
side-effecting lambda), watch it, and fix it with `ToList()`. Living through that once teaches
deferred execution better than any paragraph.
