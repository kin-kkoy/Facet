# SQL + EF Core

An API that forgets everything when it restarts isn't useful. This chapter is about **persistence**:
storing data in a relational database and talking to it from C#. Two layers — **SQL** (the language
databases speak) and **EF Core** (the ORM that lets you work in C# objects and LINQ) — and you need
enough of both to know what EF is doing for you.

---

## 1. Enough SQL to be dangerous

A relational database stores **tables** (rows × typed columns) linked by **keys**. You should be able
to read and write basic SQL by hand even though EF will usually write it for you:

```sql
CREATE TABLE Customers (Id INT PRIMARY KEY, Name TEXT NOT NULL);
CREATE TABLE Orders (Id INT PRIMARY KEY, CustomerId INT REFERENCES Customers(Id), Amount NUMERIC);

SELECT c.Name, SUM(o.Amount) AS Total     -- columns to return
FROM Orders o
JOIN Customers c ON c.Id = o.CustomerId   -- combine rows by key
WHERE o.Amount > 10
GROUP BY c.Name                            -- one row per customer
ORDER BY Total DESC;
```

Notice how much this rhymes with **LINQ** (`Join`, `Where`, `GroupBy`, `OrderBy`) — that's not a
coincidence; LINQ was designed to mirror SQL. Key concepts to hold: **primary key** (unique row id),
**foreign key** (a column pointing at another table's key — this is how relationships are modeled),
**index** (a lookup structure that makes `WHERE`/`JOIN` on a column fast), and **transaction** (a
group of changes that all commit or all roll back).

> **Try it (lab):** on paper, design two tables for the to-do API — `Users` and `Todos` — with a
> foreign key from `Todos.UserId` to `Users.Id`. Write the `SELECT` that returns each user's open
> todos.

---

## 2. EF Core: model, context, migrations

**EF Core** maps C# classes (**entities**) to tables and lets you query with LINQ. You define
entities and a **`DbContext`** (your gateway to the database):

```csharp
using Microsoft.EntityFrameworkCore;

class Todo { public int Id { get; set; } public string Title { get; set; } = "";
             public bool Done { get; set; } public int UserId { get; set; } }

class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<Todo> Todos => Set<Todo>();     // one DbSet per table
}
```

Conventions do the heavy lifting: a property named `Id` becomes the primary key; `UserId` becomes a
foreign key. You evolve the schema with **migrations** — versioned, code-generated schema changes:

```
dotnet ef migrations add InitialCreate   # generates a migration from your entities
dotnet ef database update                # applies pending migrations to the database
```

**Mental model:** your C# classes are the source of truth; migrations are the diff history that keeps
the real database in step. Never hand-edit the production schema out from under EF.

> **Try it (lab):** create the `Todo` entity + `AppDb`, register it in DI
> (`builder.Services.AddDbContext<AppDb>(...)`), add an `InitialCreate` migration, and update the
> database. You now have a real table.

---

## 3. Querying — LINQ becomes SQL

You query with the same LINQ you already learned; EF **translates it to SQL** and runs it on the
server:

```csharp
// runs as a WHERE + ORDER BY in the database, returns only matching rows:
var open = await db.Todos.Where(t => !t.Done && t.UserId == userId)
                         .OrderBy(t => t.Title)
                         .ToListAsync();

await db.Todos.AddAsync(new Todo { Title = "Ship it", UserId = userId });
await db.SaveChangesAsync();   // INSERT happens here, in one round-trip
```

This is where **deferred execution** (LINQ chapter) becomes critical: the query is SQL only when you
enumerate it (`ToListAsync`, `FirstAsync`). Keep filtering *before* materialising so the database does
the work — `db.Todos.Where(...)` filters in SQL, but `(await db.Todos.ToListAsync()).Where(...)` drags
the whole table into memory first. **Materialise late.**

**Tracking vs no-tracking:** by default EF *tracks* the entities it returns so it can detect your
edits on `SaveChanges`. For read-only queries, `.AsNoTracking()` skips that bookkeeping and is faster.

> **Try it (lab):** write two versions of "count done todos" — one filtering in SQL
> (`db.Todos.CountAsync(t => t.Done)`) and one that `ToListAsync()`s then counts in memory. Reason
> about which hits the database harder.

---

## 4. Relationships & the N+1 trap

Model relationships with **navigation properties**; load related data explicitly with `Include`:

```csharp
class User { public int Id { get; set; } public string Name { get; set; } = "";
             public List<Todo> Todos { get; set; } = new(); }   // navigation

var users = await db.Users.Include(u => u.Todos).ToListAsync();  // one query, joins Todos
```

The **N+1 problem** is the most common EF performance bug: you load N users, then lazily access each
user's `Todos`, firing **one query per user** (1 + N queries). `Include` (or a projection) fetches
everything in one round-trip. Watch the generated SQL (EF can log it) and you'll spot N+1 instantly.

---

## Performance notes

- **`.AsNoTracking()` for read-only** queries — less memory and CPU when you won't save changes.
- **Project to a DTO** with `Select` to fetch only the columns you need
  (`.Select(t => new TodoDto(t.Id, t.Title))`) instead of whole entities.
- **Kill N+1** with `Include` or a projection; never lazy-load inside a loop.
- **Index the columns you filter/join on** — an unindexed `WHERE` on a big table scans every row.
- **Batch writes**: many `Add`s then one `SaveChangesAsync()` is one round-trip; saving inside a loop
  is many.

## Build it (make the chapter real)

Put the to-do API on a **real database** (SQLite is a zero-setup start; Postgres for the real thing):

1. `Todo` and `User` entities with a one-to-many relationship (a user has many todos).
2. `AppDb : DbContext`, registered via DI, with an initial migration applied.
3. Rewrite the endpoints from the ASP.NET chapter to read/write through EF with `async`/`await`.
4. Add a `GET /users/{id}/todos` that uses `Include` — then check the logged SQL is **one** query,
   not N+1.

Success test: data survives a restart, your list endpoint runs a single SQL statement, and your
write endpoints persist. That's a data-backed API — the centerpiece of a junior portfolio.
