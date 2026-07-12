# Appendix A — Common Compiler Errors

A lookup table of frequently encountered C# compiler errors and warnings, their causes, and fixes.

---

## Quick Summary

This appendix indexes the compiler diagnostics (`CS####` errors, `CS8###` nullable warnings) developers hit most often — especially those coming from C or Java, where the underlying rule doesn't exist or works differently. Use this as a fast lookup: find the error code or symptom, see the cause, apply the fix.

---

## CS0029 — Cannot implicitly convert type 'X' to 'Y'

**Cause:** Assigning a value of one type to a variable of an incompatible type without an explicit or implicit conversion.

```csharp
double d = 3.14;
int i = d; // CS0029
```

**Fix:** Use an explicit cast or a conversion method.

```csharp
int i = (int)d;
```

---

## CS0117 — 'X' does not contain a definition for 'Y'

**Cause:** Referencing a member that doesn't exist on the type — often a typo, or expecting a member from a similarly named type in another language's standard library.

**Fix:** Check the actual API surface (IntelliSense or documentation) rather than assuming parity with C/Java naming.

---

## CS0161 — Not all code paths return a value

**Cause:** A method with a non-`void` return type has at least one path that doesn't `return`.

```csharp
int Classify(int x)
{
    if (x > 0) return 1;
    // missing return for x <= 0
} // CS0161
```

**Fix:** Ensure every path returns, or add a trailing `return`/`throw`.

---

## CS0165 — Use of unassigned local variable

**Cause:** C# requires definite assignment before use — unlike C, reading an uninitialized local is a compile error, not undefined behavior.

```csharp
int x;
Console.WriteLine(x); // CS0165
```

**Fix:** Initialize the variable before use.

---

## CS0246 — The type or namespace name 'X' could not be found

**Cause:** Missing `using` directive or missing package/project reference.

**Fix:** Add the appropriate `using`, or add the NuGet package/project reference that defines the type.

---

## CS0161 / CS8509 — Switch expression is not exhaustive

**Cause:** A `switch` expression doesn't cover all possible input patterns and lacks a `_` discard arm.

**Fix:** Add a `_ => ...` default arm, or handle all enum members explicitly.

---

## CS1061 — 'X' does not contain a definition for 'Y' and no accessible extension method was found

**Cause:** Calling a LINQ or other extension method without the required `using` directive in scope (commonly `using System.Linq;`).

**Fix:** Add the missing `using` directive.

```csharp
using System.Linq; // required for .Where(), .Select(), etc.
```

---

## CS8600 — Converting null literal or possible null value to non-nullable type

**Cause:** Nullable Reference Types is enabled, and a nullable value is assigned to a non-nullable variable without a null check.

**Fix:** Add a null check, use the null-forgiving operator (`!`) if you've verified safety, or change the target to a nullable type (`string?`).

---

## CS8602 — Dereference of a possibly null reference

**Cause:** Calling a member on a value the compiler's nullable flow analysis considers possibly null.

```csharp
string? name = GetName();
Console.WriteLine(name.Length); // CS8602
```

**Fix:** Add a null check or use `?.`/`??`.

```csharp
Console.WriteLine(name?.Length ?? 0);
```

---

## CS0103 — The name 'X' does not exist in the current context

**Cause:** Using a variable outside its scope, or a typo in an identifier name.

**Fix:** Verify the variable is declared in an enclosing (not sibling) scope, and check spelling/casing (C# is case-sensitive).

---

## CS0501 — Must declare a body because it is not marked abstract, extern, or partial

**Cause:** Declaring a method signature without a body outside of an interface, abstract class, or partial method context — often from forgetting `{ }` or misusing interface syntax in a class.

**Fix:** Provide a method body, or mark the containing member/type appropriately (`abstract`, `partial`).

---

## CS0122 — 'X' is inaccessible due to its protection level

**Cause:** Attempting to access a `private`/`internal` member from outside its accessible scope.

**Fix:** Adjust the member's access modifier, or access it through a public API surface instead.

---

## Related Features

See also:

* Nullable Reference Types
* Exceptions
* Encapsulation

---

## Official Documentation

* [C# compiler errors index](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/)
* [Nullable warnings reference](https://learn.microsoft.com/en-us/dotnet/csharp/nullable-warnings)
