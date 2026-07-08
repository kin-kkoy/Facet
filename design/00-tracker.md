# 00: Project Tracker & Roslyn Manual

This file serves as the master record for what has been implemented, open questions raised during development, and the detailed manual for the Phase 1 Roslyn execution engine.

---

## 1. Implementation Tracker

- `[/]` **Milestone 1: App Scaffolding**
  - `[x]` Initialize Tauri + Vite (React) workspace.
  - `[x]` Scaffold C# Console App (Roslyn Sidecar).
  - `[x]` Setup IPC (Inter-Process Communication) between UI and Sidecar.
- `[/]` **Milestone 2: UI Implementation**
  - `[x]` Port Vanilla CSS into React environment.
  - `[x]` Build modular panels (Source, Runtime, Scratch Pad).
  - `[x]` Build Map View (Infinite canvas, nodes, paths).
- `[x]` **Milestone 3: The Roslyn Engine**
  - `[x]` Implement `Microsoft.CodeAnalysis.CSharp.Scripting`.
  - `[x]` Inject tracing hooks for line-by-line state capture.
  - `[x]` Output JSON traces.
- `[x]` **Milestone 4: Integration**
  - `[x]` Connect UI Timeline slider to engine JSON trace.

---

## 1b. Phase 2 Tracker

- `[x]` **Milestone 1: Monaco Editor**
  - `[x]` Install `@monaco-editor/react`.
  - `[x]` Replace SourcePanel with interactive code editor.
  - `[x]` Sync typed code to Roslyn engine.
- `[x]` **Milestone 2: Draggable Split Panes**
  - `[x]` Make window gutters draggable to resize panels.

---

## 1c. Phase 3 Tracker

- `[/]` **Milestone 1: OpenRouter Integration**
  - `[x]` Implement Settings modal for API key and theme toggles.
  - `[x]` Implement Socratic Tutor slide-out drawer.
  - `[x]` Connect UI AI buttons to OpenRouter API.
- `[x]` **Milestone 2: Interactive Knowledge Map**
  - `[x]` Build infinite canvas panning.
  - `[x]` Build PoE-style high-contrast nodes and color-inheriting links.
  - `[x]` Generate Curriculum via AI and render map.

---

## 2. Open Development Questions

*(No open questions currently. Questions will be logged here as development proceeds.)*

---

## 3. The Roslyn Engine (MVP)

The engine is built to support the most common scenarios encountered when learning core Computer Science concepts (Data Structures and Algorithms).

### What it CAN do

**1. Primitives & Math Operations**
It perfectly tracks integer math, booleans, strings, and standard arithmetic operations step-by-step.
```csharp
int a = 5;
int b = 10;
int sum = a + b; // The engine captures a=5, b=10, sum=15 at this step
```

**2. Standard Iteration & Arrays**
It handles array mutations over time within `for`, `while`, and `do-while` loops.
```csharp
int[] arr = { 3, 1, 4 };
for (int i = 0; i < arr.Length; i++) 
{ 
    arr[i] = arr[i] * 2; // Engine tracks 'i' and the changing state of 'arr' 
}
```

**3. Simple Custom Classes (Linked Nodes / Trees)**
It supports instantiating basic classes to demonstrate pointers, references, and typical data structures like Linked Lists and Binary Trees.
```csharp
public class Node {
    public int val;
    public Node next;
    public Node(int v) { val = v; }
}

Node head = new Node(1);
head.next = new Node(2); // Engine tracks the reference linkage
```

**4. Recursion**
It can execute simple recursive methods and track the local variables of the active stack frame.
```csharp
int Factorial(int n) {
    if (n <= 1) return 1;
    return n * Factorial(n - 1);
}
```

### What it CANNOT do

**1. External Libraries & NuGet Packages**
The engine only supports the base `System` class library (e.g., `System.Collections.Generic`). It cannot download or reference external libraries.
*Example:* You cannot use `using Newtonsoft.Json;` or `using EntityFrameworkCore;`.

**2. Multi-Threading & Asynchrony**
The engine relies on a deterministic, single-threaded execution model to guarantee it can snapshot memory line-by-line.
*Example:* You cannot use `Task.Run(...)`, `async / await`, or spawn raw `Thread` objects. 

**3. Complex Enterprise Architectures**
It does not support complex, multi-file enterprise patterns like Dependency Injection frameworks, Web APIs, or deep inheritance hierarchies spread across multiple assemblies.
*Example:* You cannot boot up an `ASP.NET Core WebApplicationBuilder`. It is strictly for algorithmic and data structure scripts.

**4. File I/O and Networking**
For security and deterministic execution, it does not support interacting with your hard drive or the internet.
*Example:* You cannot use `File.ReadAllText("C:/data.txt")` or `new HttpClient().GetAsync("http://google.com")`.
