# Facet Architecture & Design Plan

This document consolidates the core concepts, features, and technical tradeoffs made while building Facet.

## 1. Overview
Facet is a highly specialized mini-app suite for computer science education. When a user pastes C# code, they select a specific "lens" to view it through. For example, the Flowchart lens uses static analysis to draw logic paths, while the Data Structures lens hooks into the runtime memory to draw nodes and pointers. 

## 2. Core Features (The "Lenses")
The application covers multiple CS concepts broken down into distinct modules:
1. **Flowcharts & Control Flow:** Automatically generates nested block structures from raw code.
2. **Data Structures:** Visualizes the memory layout of arrays, linked lists, and objects via custom SVG routing.
3. **OOP Concepts (Pending):** Maps out class hierarchies, inheritance, and polymorphism.
4. **Recursion (Pending):** Traces recursive functions by building a visual call tree.
5. **Algorithm Animation (Pending):** Animates sorting and searching step-by-step.
6. **Complexity / Big O (Pending):** Analyzes code and graphs its growth curve.
7. **Numerical Methods (Pending):** Plots convergence graphs.

*Note: OS concepts (DFOS) and Automata Theory were explicitly removed as they dilute the core mission of analyzing real C# code.*

## 3. Engine Architecture (`facet-engine`)
The backend is a C# Roslyn application that analyzes and executes the user's code.

- **Static Analysis Mode:** Parses the syntax tree to extract logic branches into an `ast` JSON object.
- **Dynamic Tracing Mode:** Uses `CSharpSyntaxRewriter` to inject `_Trace(line, state)` calls.
- **Deep Memory Heap:** Uses Reflection to track object IDs and pointer references, assigning unique `ref_x` IDs to user-defined objects while ignoring massive system types (like `String` or `Thread`).
- **Execution Model:** The engine executes the code *once* rapidly in the background, collects all memory state frames, and sends a giant JSON block to the React frontend. This allows smooth latency-free scrubbing forward and backward.

## 4. Frontend Architecture (`facet-app`)
- Built with **Tauri + React + Vite**.
- The `VisualizerShell` acts as a module loader, allowing the user to select which "Visualizer Lens" they want to run.
- Custom SVG pathing is used instead of heavy libraries like React Flow to maintain maximum performance and aesthetic control (glassmorphism, vibrant accents).
