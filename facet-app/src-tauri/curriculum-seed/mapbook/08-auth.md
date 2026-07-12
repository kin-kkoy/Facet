# Auth (Authentication + Authorization)

Two words that sound alike and do different jobs. **Authentication (AuthN)** = *who are you?*
**Authorization (AuthZ)** = *what are you allowed to do?* Get the distinction crisp and the rest
follows. This is where an API stops being a toy and becomes something you'd let real users touch — and
it's where mistakes are most expensive, so accuracy matters more than cleverness.

---

## 1. Authentication — proving who you are (JWT)

The common pattern for APIs is **token-based** auth with a **JWT** (JSON Web Token):

1. The user logs in with credentials once.
2. The server verifies them and issues a **signed token** containing *claims* (their id, roles, etc.).
3. The client sends that token on every subsequent request (`Authorization: Bearer <token>`).
4. The server **verifies the signature** on each request — no database hit needed to know who they are.

A JWT is three base64 parts (header.payload.signature). The payload is just claims; the **signature**
is what makes it trustworthy — only the server's secret key can produce a valid one, so the token
can't be forged or edited. Wiring it up:

```csharp
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer(options => { /* set the signing key, issuer, audience to validate */ });

app.UseAuthentication();   // middleware: read + verify the token, build the user
app.UseAuthorization();    // middleware: enforce the rules (next section)
```

Inside an endpoint you can then read the current user from `HttpContext.User` (their claims). **A JWT
is a signed claim, not a secret store** — never put anything sensitive in the payload; anyone can read
it (they just can't *change* it).

> **Try it (lab):** paste a sample JWT into jwt.io (or decode the base64 yourself) and read its three
> parts. Change one character of the payload and reason about why the signature no longer matches.

---

## 2. Authorization — what you're allowed to do

Once the framework knows *who* the user is, you gate actions. Simplest is **roles**; more flexible is
**policies**:

```csharp
app.MapDelete("/todos/{id}", (int id) => Results.NoContent())
   .RequireAuthorization();                              // must be logged in

app.MapGet("/admin/stats", () => Results.Ok(/* ... */))
   .RequireAuthorization(p => p.RequireRole("Admin"));   // must be an Admin

// or a named policy for reuse / complex rules:
builder.Services.AddAuthorization(o =>
    o.AddPolicy("Over18", p => p.RequireClaim("age", /* ... */)));
```

For "you can only edit **your own** todo," you need **resource-based** authorization — a check that
compares the resource's owner to the current user's id inside the handler, not just a role. Roles say
*what kind of user*; resource checks say *this specific thing is yours*.

> **Try it (lab):** on paper, decide the rule for each to-do endpoint: `GET /todos` (own todos only),
> `DELETE /todos/{id}` (owner only), `GET /admin/stats` (Admin role). Notice which need a role vs a
> per-resource ownership check.

---

## 3. Storing users safely (Identity + hashing)

**Never store passwords.** Store a **salted hash** — a one-way transform so that even if your database
leaks, the passwords don't. Use a slow, purpose-built algorithm (bcrypt / PBKDF2 / Argon2), never a
plain hash like SHA-256 (too fast to brute-force). ASP.NET Core **Identity** gives you user storage,
password hashing, and login flows so you don't hand-roll this:

```csharp
// Identity handles hashing + verification for you — don't reinvent it:
var result = await userManager.CreateAsync(user, plaintextPassword);   // stores a salted hash
var ok     = await signInManager.CheckPasswordSignInAsync(user, attempt, false);
```

The rule: **crypto is a place to use the library, not your own code.** Rolling your own auth is the
single most common way juniors ship a security hole.

---

## 4. Security hardening (the OWASP short list)

- **HTTPS everywhere** (`UseHttpsRedirection`) — a bearer token sent over plain HTTP is a password in
  the clear.
- **Secrets out of source control** — signing keys, DB passwords live in environment variables /
  user-secrets / a vault, never in `appsettings.json` committed to git.
- **Validate every input** (DTOs + validation from the ASP.NET chapter) — untrusted input is the root
  of most vulnerabilities.
- **Parameterised queries** — EF Core does this for you; never build SQL by string-concatenating user
  input (that's SQL injection).
- **Don't leak details in errors** — return a generic message + log the specifics server-side; a stack
  trace in a response is a gift to an attacker.

## Performance notes

- **JWT validation is a signature check, not a DB lookup** — that's *why* tokens scale: any server
  with the key can validate, no shared session store needed.
- **Hashing is intentionally slow** — that cost is a login-time expense, not per-request; don't "speed
  it up" by weakening the algorithm.
- **Cache authorization data** (roles/permissions) sensibly rather than hitting the database on every
  request, but keep it fresh enough to honor revocation.

## Build it (make the chapter real)

Lock down the to-do API:

1. A `POST /register` and `POST /login` (Identity for hashing) that issues a **JWT** on success.
2. `RequireAuthorization()` on the todo endpoints so only logged-in users reach them.
3. **Resource ownership**: a user can only read/edit/delete **their own** todos (compare the todo's
   `UserId` to the caller's id from their claims).
4. An `Admin`-role-only stats endpoint.

Success test: an anonymous request gets `401`, a logged-in user can only touch their own data
(someone else's todo id gives `403`/`404`), and passwords in the database are hashes, not text.
