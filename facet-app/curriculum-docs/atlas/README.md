# Syntax Atlas — drop your generated pages here

Put each Atlas page as its own Markdown file in this folder. When they're here,
tell me and I'll wire them into the app (a new **Syntax Atlas** tab + per-module
**Syntax Companion**), and copy them into the editable curriculum folder so they
ship with the app and stay editable without a rebuild.

## Conventions (loose — I'll adapt if yours differ)

**One file per page**, ordered by filename prefix:

```
01-types.md
02-properties.md
03-nullability.md
04-collections-generics.md
05-linq.md
06-async.md
07-exceptions.md
08-di.md
...
```

**Optional YAML frontmatter** at the top of each file (all fields optional):

```markdown
---
title: Value vs Reference Types      # else taken from the first "# heading" or the filename
modules: [m01, m01-t1]               # which module/topic node ids this page is the companion for (powers #3)
---

# Value vs Reference Types
...
```

- `modules:` is the link for the **per-module companion** — list the node id(s)
  this page explains (e.g. the LINQ page → `[m04]`, the async page → `[m05]`,
  the DI page → `[m06-t2]`). If you skip it, I'll match pages to modules by title.
- **Code fences should name the language** so they get syntax highlighting —
  ` ```csharp `, ` ```java `, ` ```c `. Side-by-side C#/C/Java comparisons are ideal.

That's it — drop the files, tell me they're in, and I'll build #2 and #3.
