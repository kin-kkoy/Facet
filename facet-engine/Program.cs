using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Scripting;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Scripting;

namespace FacetEngine
{
    public class Globals
    {
        public Action<int, object> _Trace { get; set; }
        public Action<string, object> _Enter { get; set; }
        public Action<object> _Exit { get; set; }
        public Func<object, object> _RecIdx { get; set; }
    }

    // Instrumentation hooks exposed statically so injected calls resolve from ANY
    // scope — including methods inside user-declared classes, which cannot reach the
    // script globals. Wired to the per-run closures before execution.
    public static class FacetHooks
    {
        public static Action<int, object> Trace;
        public static Action<string, object> Enter;
        public static Action<object> Exit;
        public static Func<object, object> RecIdx;
    }

    // A single function invocation in the recursion/call-tree lens.
    public class CallNode
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Args { get; set; } = "";
        public string Return { get; set; }   // null while active / for void
        public int Depth { get; set; }
        public int EnterStep { get; set; }
        public int ExitStep { get; set; }
        public List<CallNode> Children { get; set; } = new();
    }

    public class TraceEvent
    {
        public int Step { get; set; }
        public int Line { get; set; }
        public Dictionary<string, object> Stack { get; set; } = new();
        public Dictionary<string, object> Heap { get; set; } = new();
        public string Output { get; set; } = "";
        public int[] Accessed { get; set; } = System.Array.Empty<int>();  // array indices read this step
    }

    public class AstNode
    {
        public string Type { get; set; }
        public string Label { get; set; }
        public int StartLine { get; set; }
        public int EndLine { get; set; }
        public List<AstNode> Children { get; set; } = new();
    }

    // Static class model for the OOP lens (named ClassMember to avoid colliding
    // with System.Reflection.MemberInfo used elsewhere in this file).
    public class ClassMember
    {
        public string Name { get; set; }
        public string Type { get; set; }     // field/property type, or method return type
        public string Access { get; set; }   // public | protected | internal | private
        public bool IsStatic { get; set; }
        public string Params { get; set; }    // method signature "(int a)"; null for fields
    }

    public class ClassInfo
    {
        public string Name { get; set; }
        public string Kind { get; set; }      // class | abstract | struct | interface | enum
        public string Base { get; set; }      // base class name (if declared as a class) or null
        public List<string> Interfaces { get; set; } = new();
        public List<ClassMember> Fields { get; set; } = new();
        public List<ClassMember> Methods { get; set; } = new();
        public int StartLine { get; set; }
        public int EndLine { get; set; }
    }

    // Estimated Big-O for a single method (heuristic: loop nesting + recursion).
    public class ComplexityInfo
    {
        public string Name { get; set; }
        public int LoopDepth { get; set; }
        public int SelfCalls { get; set; }
        public bool Recursive { get; set; }   // direct or mutual
        public bool Logarithmic { get; set; }
        public string BigO { get; set; }
        public int StartLine { get; set; }
        public int EndLine { get; set; }
    }

    // Heuristic complexity estimator: max linear loop nesting + self-call count,
    // with a light log-iteration signal. Approximate by nature (labelled as such in UI).
    class ComplexityAnalyzer
    {
        public List<ComplexityInfo> Methods { get; } = new();

        private static readonly string[] LogSignals = { "/= 2", "/=2", "*= 2", "*=2", ">>= 1", ">>=1", "<<= 1", "<<=1" };

        public void Analyze(SyntaxNode root)
        {
            var decls = new List<(string name, SyntaxNode body, SyntaxNode decl)>();
            foreach (var n in root.DescendantNodes())
            {
                if (n is MethodDeclarationSyntax m) decls.Add((m.Identifier.Text, (SyntaxNode)m.Body ?? m.ExpressionBody, m));
                else if (n is LocalFunctionStatementSyntax lf) decls.Add((lf.Identifier.Text, (SyntaxNode)lf.Body ?? lf.ExpressionBody, lf));
            }

            // Build a name → callees graph to detect recursion cycles (direct & mutual).
            var methodNames = new HashSet<string>(decls.Select(d => d.name));
            var graph = new Dictionary<string, HashSet<string>>();
            foreach (var (name, body, _) in decls)
            {
                if (!graph.TryGetValue(name, out var set)) graph[name] = set = new HashSet<string>();
                if (body == null) continue;
                foreach (var inv in body.DescendantNodes().OfType<InvocationExpressionSyntax>())
                {
                    var callee = InvokedName(inv);
                    if (callee != null && methodNames.Contains(callee)) set.Add(callee);
                }
            }

            foreach (var (name, body, decl) in decls)
                Add(name, body, decl, InCycle(name, graph));
        }

        // True if following the call graph from `start` can return to `start`.
        private static bool InCycle(string start, Dictionary<string, HashSet<string>> graph)
        {
            if (!graph.TryGetValue(start, out var initial)) return false;
            var visited = new HashSet<string>();
            var stack = new Stack<string>(initial);
            while (stack.Count > 0)
            {
                var cur = stack.Pop();
                if (cur == start) return true;
                if (!visited.Add(cur)) continue;
                if (graph.TryGetValue(cur, out var next)) foreach (var c in next) stack.Push(c);
            }
            return false;
        }

        private void Add(string name, SyntaxNode body, SyntaxNode decl, bool recursive)
        {
            if (body == null) return;
            bool hasLog = false;
            int depth = MaxLoopDepth(body, 0, ref hasLog);
            int selfCalls = body.DescendantNodes().OfType<InvocationExpressionSyntax>().Count(inv => InvokedName(inv) == name);
            var span = decl.GetLocation().GetLineSpan();
            Methods.Add(new ComplexityInfo
            {
                Name = name,
                LoopDepth = depth,
                SelfCalls = selfCalls,
                Recursive = recursive,
                Logarithmic = hasLog,
                BigO = Estimate(depth, selfCalls, hasLog, recursive),
                StartLine = span.StartLinePosition.Line + 1,
                EndLine = span.EndLinePosition.Line + 1,
            });
        }

        private static string InvokedName(InvocationExpressionSyntax inv) => inv.Expression switch
        {
            IdentifierNameSyntax id => id.Identifier.Text,
            MemberAccessExpressionSyntax ma => ma.Name.Identifier.Text,
            _ => null
        };

        private int MaxLoopDepth(SyntaxNode node, int cur, ref bool hasLog)
        {
            int best = cur;
            foreach (var child in node.ChildNodes())
            {
                if (child is LocalFunctionStatementSyntax || child is AnonymousFunctionExpressionSyntax) continue; // nested scope boundary
                int d = cur;
                if (child is ForStatementSyntax or ForEachStatementSyntax or WhileStatementSyntax or DoStatementSyntax)
                {
                    if (IsLogLoop(child)) hasLog = true; // logarithmic factor, not a linear level
                    else d = cur + 1;
                }
                best = Math.Max(best, MaxLoopDepth(child, d, ref hasLog));
            }
            return best;
        }

        private static bool IsLogLoop(SyntaxNode loop)
        {
            if (loop is ForStatementSyntax f)
                return f.Incrementors.Any(inc => LogSignals.Any(s => inc.ToString().Contains(s)));

            var (cond, body) = loop switch
            {
                WhileStatementSyntax w => (w.Condition, w.Statement),
                DoStatementSyntax d => (d.Condition, d.Statement),
                _ => (null, (StatementSyntax)null)
            };
            if (body == null) return false;

            // (a) explicit halving/doubling of a variable in the immediate body.
            var stmts = body is BlockSyntax b ? b.Statements.Cast<SyntaxNode>() : new[] { (SyntaxNode)body };
            if (stmts.Any(st => LogSignals.Any(s => st.ToString().Contains(s)))) return true;

            // (b) binary-search shape: while (lo <= hi) { mid = (lo+hi)/2; ...; lo = mid+1; }
            //     — relational condition over two identifiers, a midpoint halving, and a
            //       reassignment of one bound. Specific enough to avoid flagging plain `/2`.
            if (cond is BinaryExpressionSyntax be
                && be.Left is IdentifierNameSyntax && be.Right is IdentifierNameSyntax
                && (be.OperatorToken.IsKind(SyntaxKind.LessThanToken)
                    || be.OperatorToken.IsKind(SyntaxKind.LessThanEqualsToken)
                    || be.OperatorToken.IsKind(SyntaxKind.GreaterThanToken)
                    || be.OperatorToken.IsKind(SyntaxKind.GreaterThanEqualsToken)))
            {
                string bodyText = body.ToString();
                bool halving = bodyText.Contains("/ 2") || bodyText.Contains("/2") || bodyText.Contains(">> 1") || bodyText.Contains(">>1");
                var vars = new[] { be.Left.ToString(), be.Right.ToString() };
                bool reassignsBound = vars.Any(v =>
                    System.Text.RegularExpressions.Regex.IsMatch(bodyText, "\\b" + System.Text.RegularExpressions.Regex.Escape(v) + "\\s*=(?!=)"));
                if (halving && reassignsBound) return true;
            }
            return false;
        }

        private static string Power(int d) => d switch { 0 => "O(1)", 1 => "O(n)", 2 => "O(n²)", 3 => "O(n³)", _ => $"O(n^{d})" };

        private static string Estimate(int loopDepth, int selfCalls, bool hasLog, bool recursive)
        {
            if (selfCalls >= 2) return "O(2ⁿ)"; // branching recursion (e.g. naive Fibonacci)
            int baseDeg = loopDepth + ((selfCalls == 1 || recursive) ? 1 : 0);
            if (baseDeg == 0) return hasLog ? "O(log n)" : "O(1)";
            return hasLog ? Power(baseDeg) + " · log n" : Power(baseDeg);
        }
    }

    // Walks type declarations and builds a UML-style model. Base types are
    // classified against the set of types declared in the same file (with an
    // I-prefix fallback for external interfaces), since we have no semantic model.
    class ClassModelAnalyzer : CSharpSyntaxWalker
    {
        public List<ClassInfo> Classes { get; } = new();
        private readonly Dictionary<string, string> _declaredKinds;

        public ClassModelAnalyzer(Dictionary<string, string> declaredKinds) { _declaredKinds = declaredKinds; }

        private static string AccessOf(SyntaxTokenList mods)
        {
            if (mods.Any(m => m.IsKind(SyntaxKind.PublicKeyword))) return "public";
            if (mods.Any(m => m.IsKind(SyntaxKind.ProtectedKeyword))) return "protected";
            if (mods.Any(m => m.IsKind(SyntaxKind.InternalKeyword))) return "internal";
            return "private";
        }

        private static bool IsStatic(SyntaxTokenList mods) => mods.Any(m => m.IsKind(SyntaxKind.StaticKeyword));

        private static string ParamStr(ParameterListSyntax pl) =>
            "(" + string.Join(", ", pl.Parameters.Select(p => (p.Type != null ? p.Type + " " : "") + p.Identifier.Text)) + ")";

        private void ExtractMembers(ClassInfo ci, SyntaxList<MemberDeclarationSyntax> members)
        {
            foreach (var m in members)
            {
                switch (m)
                {
                    case FieldDeclarationSyntax f:
                        foreach (var v in f.Declaration.Variables)
                            ci.Fields.Add(new ClassMember { Name = v.Identifier.Text, Type = f.Declaration.Type.ToString(), Access = AccessOf(f.Modifiers), IsStatic = IsStatic(f.Modifiers) });
                        break;
                    case PropertyDeclarationSyntax p:
                        ci.Fields.Add(new ClassMember { Name = p.Identifier.Text, Type = p.Type.ToString(), Access = AccessOf(p.Modifiers), IsStatic = IsStatic(p.Modifiers) });
                        break;
                    case MethodDeclarationSyntax me:
                        ci.Methods.Add(new ClassMember { Name = me.Identifier.Text, Type = me.ReturnType.ToString(), Access = AccessOf(me.Modifiers), IsStatic = IsStatic(me.Modifiers), Params = ParamStr(me.ParameterList) });
                        break;
                    case ConstructorDeclarationSyntax ctor:
                        ci.Methods.Add(new ClassMember { Name = ctor.Identifier.Text, Type = "ctor", Access = AccessOf(ctor.Modifiers), Params = ParamStr(ctor.ParameterList) });
                        break;
                }
            }
        }

        private void Build(TypeDeclarationSyntax node, string kind)
        {
            var span = node.GetLocation().GetLineSpan();
            var ci = new ClassInfo
            {
                Name = node.Identifier.Text,
                Kind = node.Modifiers.Any(m => m.IsKind(SyntaxKind.AbstractKeyword)) ? "abstract" : kind,
                StartLine = span.StartLinePosition.Line + 1,
                EndLine = span.EndLinePosition.Line + 1
            };
            if (node.BaseList != null)
            {
                foreach (var b in node.BaseList.Types)
                {
                    var name = b.Type.ToString();
                    var simple = name.Contains('.') ? name.Substring(name.LastIndexOf('.') + 1) : name;
                    _declaredKinds.TryGetValue(simple, out var k);
                    bool isInterface = k == "interface" || (k == null && simple.Length > 1 && simple[0] == 'I' && char.IsUpper(simple[1]));
                    if (isInterface) ci.Interfaces.Add(simple);
                    else if (ci.Base == null) ci.Base = simple;
                    else ci.Interfaces.Add(simple);
                }
            }
            ExtractMembers(ci, node.Members);
            if (kind == "interface")
            {
                // Interface members are implicitly public.
                foreach (var mem in ci.Fields) mem.Access = "public";
                foreach (var mem in ci.Methods) mem.Access = "public";
            }
            Classes.Add(ci);
        }

        public override void VisitClassDeclaration(ClassDeclarationSyntax node) { Build(node, "class"); base.VisitClassDeclaration(node); }
        public override void VisitStructDeclaration(StructDeclarationSyntax node) { Build(node, "struct"); base.VisitStructDeclaration(node); }
        public override void VisitInterfaceDeclaration(InterfaceDeclarationSyntax node) { Build(node, "interface"); base.VisitInterfaceDeclaration(node); }
        public override void VisitEnumDeclaration(EnumDeclarationSyntax node)
        {
            var span = node.GetLocation().GetLineSpan();
            var ci = new ClassInfo { Name = node.Identifier.Text, Kind = "enum", StartLine = span.StartLinePosition.Line + 1, EndLine = span.EndLinePosition.Line + 1 };
            foreach (var m in node.Members) ci.Fields.Add(new ClassMember { Name = m.Identifier.Text, Type = "", Access = "public" });
            Classes.Add(ci);
        }
    }

    // Thrown from _Trace once the step cap is reached, to unwind out of a runaway loop
    // (a CancellationToken can't interrupt CPU-bound managed code).
    class TraceLimitException : Exception { }

    class ReferenceEqualityComparer : IEqualityComparer<object>
    {
        new public bool Equals(object x, object y) => ReferenceEquals(x, y);
        public int GetHashCode(object obj) => System.Runtime.CompilerServices.RuntimeHelpers.GetHashCode(obj);
    }

    class SyntaxTreeAnalyzer : CSharpSyntaxWalker
    {
        public AstNode Root { get; } = new AstNode { Type = "Root", Label = "Program" };
        private Stack<AstNode> _stack = new Stack<AstNode>();

        public SyntaxTreeAnalyzer()
        {
            _stack.Push(Root);
        }

        private void AddNode(AstNode node)
        {
            _stack.Peek().Children.Add(node);
        }

        private AstNode CreateAstNode(SyntaxNode node, string type, string label)
        {
            var span = node.GetLocation().GetLineSpan();
            return new AstNode
            {
                Type = type,
                Label = label,
                StartLine = span.StartLinePosition.Line + 1,
                EndLine = span.EndLinePosition.Line + 1
            };
        }

        // Runs `visit` with `node` pushed as the current parent so children nest correctly.
        private void Descend(AstNode node, Action visit)
        {
            AddNode(node);
            _stack.Push(node);
            visit();
            _stack.Pop();
        }

        public override void VisitIfStatement(IfStatementSyntax node)
        {
            var ifNode = CreateAstNode(node, "If", "if (" + node.Condition.ToString() + ")");
            Descend(ifNode, () =>
            {
                if (node.Statement != null) Visit(node.Statement);
            });

            // Emit else / else-if as a sibling rather than folding it into the If node.
            if (node.Else != null)
            {
                var elseStatement = node.Else.Statement;
                if (elseStatement is IfStatementSyntax)
                {
                    // "else if" — recurse so it renders as its own branch node.
                    Visit(elseStatement);
                }
                else
                {
                    var elseNode = CreateAstNode(node.Else, "Else", "else");
                    Descend(elseNode, () =>
                    {
                        if (elseStatement != null) Visit(elseStatement);
                    });
                }
            }
        }

        public override void VisitForStatement(ForStatementSyntax node)
        {
            Descend(CreateAstNode(node, "For", "for loop"), () => base.VisitForStatement(node));
        }

        public override void VisitForEachStatement(ForEachStatementSyntax node)
        {
            var label = "foreach (" + node.Type + " " + node.Identifier.Text + " in " + node.Expression + ")";
            Descend(CreateAstNode(node, "Foreach", label), () => base.VisitForEachStatement(node));
        }

        public override void VisitWhileStatement(WhileStatementSyntax node)
        {
            Descend(CreateAstNode(node, "While", "while (" + node.Condition.ToString() + ")"), () => base.VisitWhileStatement(node));
        }

        public override void VisitDoStatement(DoStatementSyntax node)
        {
            Descend(CreateAstNode(node, "While", "do ... while (" + node.Condition.ToString() + ")"), () => base.VisitDoStatement(node));
        }

        public override void VisitSwitchStatement(SwitchStatementSyntax node)
        {
            Descend(CreateAstNode(node, "Switch", "switch (" + node.Expression + ")"), () => base.VisitSwitchStatement(node));
        }

        public override void VisitTryStatement(TryStatementSyntax node)
        {
            Descend(CreateAstNode(node, "Try", "try"), () => base.VisitTryStatement(node));
        }

        public override void VisitMethodDeclaration(MethodDeclarationSyntax node)
        {
            Descend(CreateAstNode(node, "Method", node.Identifier.Text), () => base.VisitMethodDeclaration(node));
        }

        public override void VisitLocalFunctionStatement(LocalFunctionStatementSyntax node)
        {
            Descend(CreateAstNode(node, "Method", node.Identifier.Text), () => base.VisitLocalFunctionStatement(node));
        }

        public override void VisitClassDeclaration(ClassDeclarationSyntax node)
        {
            Descend(CreateAstNode(node, "Class", "class " + node.Identifier.Text), () => base.VisitClassDeclaration(node));
        }

        public override void VisitStructDeclaration(StructDeclarationSyntax node)
        {
            Descend(CreateAstNode(node, "Class", "struct " + node.Identifier.Text), () => base.VisitStructDeclaration(node));
        }
    }

    // Records array/list element READS so the animation lens can show which cells are
    // being compared. Rewrites `arr[i]` (read position, simple base & index) into
    // `(FacetEngine.FacetHooks.RecIdx((object)(i)), arr[i]).Item2` — records the index, returns the value.
    class AccessRecorder : CSharpSyntaxRewriter
    {
        public override SyntaxNode VisitElementAccessExpression(ElementAccessExpressionSyntax node)
        {
            var visited = (ElementAccessExpressionSyntax)base.VisitElementAccessExpression(node);
            if (IsWriteTarget(node)) return visited;
            if (node.ArgumentList.Arguments.Count != 1) return visited;
            if (!(visited.Expression is IdentifierNameSyntax)) return visited;
            var idx = visited.ArgumentList.Arguments[0].Expression;
            if (!IsSimple(idx)) return visited;

            string b = visited.Expression.ToString();
            string i = idx.ToString();
            return SyntaxFactory.ParseExpression($"(FacetEngine.FacetHooks.RecIdx((object)({i})), {b}[{i}]).Item2")
                                .WithTriviaFrom(visited);
        }

        // The access is being written (not read): don't wrap it.
        private static bool IsWriteTarget(ElementAccessExpressionSyntax node)
        {
            switch (node.Parent)
            {
                case AssignmentExpressionSyntax a when a.Left == node: return true;
                case PostfixUnaryExpressionSyntax: return true;
                case PrefixUnaryExpressionSyntax pre when pre.IsKind(SyntaxKind.PreIncrementExpression) || pre.IsKind(SyntaxKind.PreDecrementExpression): return true;
                case ArgumentSyntax arg when !arg.RefKindKeyword.IsKind(SyntaxKind.None): return true;
                default: return false;
            }
        }

        // Only pure, side-effect-free index expressions (avoids double-eval hazards).
        private static bool IsSimple(ExpressionSyntax e) => e switch
        {
            IdentifierNameSyntax => true,
            LiteralExpressionSyntax lit => lit.IsKind(SyntaxKind.NumericLiteralExpression),
            ParenthesizedExpressionSyntax p => IsSimple(p.Expression),
            BinaryExpressionSyntax b when b.IsKind(SyntaxKind.AddExpression) || b.IsKind(SyntaxKind.SubtractExpression) || b.IsKind(SyntaxKind.MultiplyExpression)
                => IsSimple(b.Left) && IsSimple(b.Right),
            _ => false
        };
    }

    // Injects _Enter/_Exit around method & local-function bodies so a call tree can
    // be reconstructed. Returns are rewritten to capture their value before exiting.
    // Run AFTER TracingRewriter so per-line trace numbers stay correct.
    class CallCaptureRewriter : CSharpSyntaxRewriter
    {
        private int _tmp = 0;
        // Scope stack: true = void method, false = non-void method, null = lambda barrier
        // (returns inside a lambda must NOT be treated as method returns).
        private readonly Stack<bool?> _scopes = new();

        private static bool IsVoid(TypeSyntax t) => t is PredefinedTypeSyntax p && p.Keyword.IsKind(SyntaxKind.VoidKeyword);

        private static string ArgsExpr(ParameterListSyntax pl) =>
            pl.Parameters.Count == 0 ? "null" : "new { " + string.Join(", ", pl.Parameters.Select(p => p.Identifier.Text)) + " }";

        private static string Esc(string s) => s.Replace("\\", "\\\\").Replace("\"", "\\\"");

        private BlockSyntax WrapBody(BlockSyntax body, string name, string argsExpr, bool isVoid)
        {
            var stmts = new List<StatementSyntax>();
            stmts.Add(SyntaxFactory.ParseStatement($"FacetEngine.FacetHooks.Enter(\"{Esc(name)}\", {argsExpr});"));
            stmts.AddRange(body.Statements);
            if (isVoid) stmts.Add(SyntaxFactory.ParseStatement("FacetEngine.FacetHooks.Exit(null);"));
            return SyntaxFactory.Block(stmts);
        }

        // Convert an expression-bodied member (=> expr) into a wrapped block.
        private BlockSyntax WrapExpression(ArrowExpressionClauseSyntax arrow, string name, string argsExpr, bool isVoid)
        {
            var stmts = new List<StatementSyntax> { SyntaxFactory.ParseStatement($"FacetEngine.FacetHooks.Enter(\"{Esc(name)}\", {argsExpr});") };
            var expr = arrow.Expression.ToFullString();
            if (isVoid) { stmts.Add(SyntaxFactory.ParseStatement($"{expr};")); stmts.Add(SyntaxFactory.ParseStatement("FacetEngine.FacetHooks.Exit(null);")); }
            else { string t = "__ret" + (_tmp++); stmts.Add(SyntaxFactory.ParseStatement($"var {t} = ({expr}); FacetEngine.FacetHooks.Exit({t}); return {t};")); }
            return SyntaxFactory.Block(stmts);
        }

        public override SyntaxNode VisitMethodDeclaration(MethodDeclarationSyntax node)
        {
            bool isVoid = IsVoid(node.ReturnType);
            _scopes.Push(isVoid);
            var visited = (MethodDeclarationSyntax)base.VisitMethodDeclaration(node);
            _scopes.Pop();
            var args = ArgsExpr(node.ParameterList);
            if (visited.Body != null)
                return visited.WithBody(WrapBody(visited.Body, node.Identifier.Text, args, isVoid));
            if (visited.ExpressionBody != null)
                return visited.WithExpressionBody(null).WithSemicolonToken(default)
                              .WithBody(WrapExpression(visited.ExpressionBody, node.Identifier.Text, args, isVoid));
            return visited;
        }

        public override SyntaxNode VisitLocalFunctionStatement(LocalFunctionStatementSyntax node)
        {
            bool isVoid = IsVoid(node.ReturnType);
            _scopes.Push(isVoid);
            var visited = (LocalFunctionStatementSyntax)base.VisitLocalFunctionStatement(node);
            _scopes.Pop();
            var args = ArgsExpr(node.ParameterList);
            if (visited.Body != null)
                return visited.WithBody(WrapBody(visited.Body, node.Identifier.Text, args, isVoid));
            if (visited.ExpressionBody != null)
                return visited.WithExpressionBody(null).WithSemicolonToken(default)
                              .WithBody(WrapExpression(visited.ExpressionBody, node.Identifier.Text, args, isVoid));
            return visited;
        }

        // Lambda / anonymous-method barriers: their returns belong to the lambda, not the method.
        public override SyntaxNode VisitSimpleLambdaExpression(SimpleLambdaExpressionSyntax node) { _scopes.Push(null); var v = base.VisitSimpleLambdaExpression(node); _scopes.Pop(); return v; }
        public override SyntaxNode VisitParenthesizedLambdaExpression(ParenthesizedLambdaExpressionSyntax node) { _scopes.Push(null); var v = base.VisitParenthesizedLambdaExpression(node); _scopes.Pop(); return v; }
        public override SyntaxNode VisitAnonymousMethodExpression(AnonymousMethodExpressionSyntax node) { _scopes.Push(null); var v = base.VisitAnonymousMethodExpression(node); _scopes.Pop(); return v; }

        public override SyntaxNode VisitReturnStatement(ReturnStatementSyntax node)
        {
            // Only rewrite returns that belong to a captured method (nearest scope is a method).
            if (_scopes.Count == 0 || _scopes.Peek() == null) return base.VisitReturnStatement(node);
            if (node.Expression == null)
                return SyntaxFactory.ParseStatement("{ FacetEngine.FacetHooks.Exit(null); return; }").WithTriviaFrom(node);
            string t = "__ret" + (_tmp++);
            string expr = node.Expression.ToFullString();
            return SyntaxFactory.ParseStatement($"{{ var {t} = ({expr}); FacetEngine.FacetHooks.Exit({t}); return {t}; }}").WithTriviaFrom(node);
        }
    }

    class Program
    {
        // Guardrails so runaway user code can't hang or OOM the engine.
        const int MaxTraces = 50000;
        const int MaxElements = 1000;
        const int MaxOutputChars = 64 * 1024;
        const int TimeoutSeconds = 10;

        // Turns List`1 / Dictionary`2 into readable List<Int32> / Dictionary<String, Int32>.
        static string FriendlyTypeName(Type t)
        {
            if (!t.IsGenericType) return t.Name;
            var name = t.Name;
            int tick = name.IndexOf('`');
            if (tick > 0) name = name.Substring(0, tick);
            var args = string.Join(", ", t.GetGenericArguments().Select(FriendlyTypeName));
            return name + "<" + args + ">";
        }

        // Compact display for call-tree args/returns.
        static string FormatValue(object v)
        {
            if (v == null) return "null";
            if (v is string s) return "\"" + s + "\"";
            if (v is bool b) return b ? "true" : "false";
            var t = v.GetType();
            if (t.IsPrimitive || t == typeof(decimal)) return v.ToString();
            return FriendlyTypeName(t); // objects: show the type rather than a noisy ToString
        }

        static string FormatArgs(object argsObj)
        {
            if (argsObj == null) return "";
            var parts = new List<string>();
            foreach (var p in argsObj.GetType().GetProperties())
                parts.Add(p.Name + "=" + FormatValue(p.GetValue(argsObj)));
            return string.Join(", ", parts);
        }

        // Roslyn error ids that mean "missing type / namespace / assembly reference"
        // — i.e. the user imported/used a library the engine can't resolve.
        static readonly HashSet<string> DepErrorIds = new() { "CS0246", "CS0234", "CS1069", "CS0012", "CS0518", "CS0400" };

        // True when EVERY compile error is a dependency-resolution error (so the code
        // is fine except for external libraries we don't have).
        static bool AllDependencyErrors(IEnumerable<Diagnostic> diags)
        {
            var errs = diags.Where(d => d.Severity == DiagnosticSeverity.Error).ToList();
            return errs.Count > 0 && errs.All(d => DepErrorIds.Contains(d.Id));
        }

        // The external namespaces/types we couldn't resolve — from non-System using
        // directives and from CS0246/CS0234 diagnostics.
        static List<string> ExtractUnresolved(SyntaxNode root, IEnumerable<Diagnostic> diags)
        {
            var names = new HashSet<string>();
            if (root != null)
            {
                foreach (var u in root.DescendantNodes().OfType<UsingDirectiveSyntax>())
                {
                    var name = u.Name?.ToString();
                    if (name == null) continue;
                    var head = name.Split('.')[0];
                    if (head != "System" && head != "Microsoft") names.Add(name);
                }
            }
            foreach (var d in diags)
            {
                if (d.Id != "CS0246" && d.Id != "CS0234") continue;
                var m = d.GetMessage();
                int i = m.IndexOf('\''), j = i >= 0 ? m.IndexOf('\'', i + 1) : -1;
                if (i >= 0 && j > i) names.Add(m.Substring(i + 1, j - i - 1));
            }
            return names.OrderBy(x => x).ToList();
        }

        static async Task Main(string[] args)
        {
            // Interactive mode: run the program plainly with real console I/O (so
            // Console.ReadLine reads live stdin) — no tracing, no lens JSON. The code
            // comes from a FILE arg, leaving stdin free for the user's input.
            if (args.Length >= 2 && args[0] == "--exec")
            {
                await RunInteractive(args[1]);
                return;
            }

            string code = "";
            if (args.Length > 0 && args[0] == "--test") {
                code = "class Node { public int Val; public Node Next; } Node head = new Node { Val = 1 }; head.Next = new Node { Val = 2 };";
            } else {
                using var reader = new StreamReader(Console.OpenStandardInput());
                code = await reader.ReadToEndAsync();
            }

            if (string.IsNullOrWhiteSpace(code)) return;

            var traces = new List<TraceEvent>();
            int stepCounter = 1;

            // Object identity must be STABLE across steps: the same object keeps the same
            // ref_N id for the whole run, so a visualizer can follow it over time. These live
            // OUTSIDE the _Trace closure so they persist between calls.
            var objectMap = new Dictionary<object, string>(new ReferenceEqualityComparer());
            int nextId = 1;

            // Array indices read since the last trace (for the animation compare highlight).
            var currentAccesses = new List<int>();

            // Call-tree tracking for the recursion lens.
            var callRoot = new CallNode { Id = 0, Name = "«program»", Depth = -1 };
            var callStack = new Stack<CallNode>();
            callStack.Push(callRoot);
            int callId = 1;
            int callCount = 0;
            const int MaxCalls = 20000;

            var originalOut = Console.Out;
            using var sw = new StringWriter();
            Console.SetOut(sw);

            var globals = new Globals
            {
                _Trace = (line, stateObj) =>
                {
                    // Stop a runaway loop by unwinding out of user code.
                    if (traces.Count >= MaxTraces) throw new TraceLimitException();

                    var stack = new Dictionary<string, object>();
                    // The heap is rebuilt each step (the frontend only reads the current step's
                    // heap) but ids come from the persistent objectMap above.
                    var heap = new Dictionary<string, object>();
                    var visited = new HashSet<object>(new ReferenceEqualityComparer());

                    // Emits public + non-public STATIC fields of a user-defined type as its own
                    // heap card, so static program state is visible somewhere.
                    void EmitStatics(Type type)
                    {
                        string sid = "statics_" + type.Name;
                        if (heap.ContainsKey(sid)) return;

                        var staticFields = type
                            .GetFields(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static)
                            .Where(f => !f.IsLiteral && !f.Name.Contains("k__BackingField"))
                            .ToArray();
                        if (staticFields.Length == 0) return;

                        // Reserve the slot first so recursive statics don't re-enter.
                        heap[sid] = null;
                        var so = new Dictionary<string, object>();
                        so["_type"] = "static " + FriendlyTypeName(type);
                        foreach (var f in staticFields)
                        {
                            try {
                                var v = f.GetValue(null);
                                var vId = GetObjectId(v);
                                so[f.Name] = vId != null ? (object)new { @ref = vId } : v;
                            } catch (Exception ex) { so[f.Name] = "<error: " + ex.Message + ">"; }
                        }
                        heap[sid] = so;
                    }

                    string GetObjectId(object obj)
                    {
                        if (obj == null) return null;
                        var type = obj.GetType();

                        // Shallow values render inline, no heap card / ref.
                        if (type.IsPrimitive || type == typeof(string) || type == typeof(decimal))
                            return null;

                        // Stable id from the persistent map (assign on first ever sighting).
                        if (!objectMap.TryGetValue(obj, out string id))
                        {
                            id = "ref_" + nextId++;
                            objectMap[obj] = id;
                        }

                        // But (re)serialize into THIS step's heap, once per step. `visited`
                        // (not objectMap) is the cycle guard so live objects reappear each step.
                        if (!visited.Add(obj)) return id;

                        var serializedObj = new Dictionary<string, object>();
                        serializedObj["_type"] = FriendlyTypeName(type);

                        if (obj is IDictionary dict)
                        {
                            // Dictionaries: emit real key/value pairs (would otherwise degrade
                            // to a list of empty KeyValuePair blobs via the IEnumerable path).
                            var entries = new List<object>();
                            int count = 0;
                            foreach (DictionaryEntry e in dict)
                            {
                                if (count++ >= MaxElements) { entries.Add("…truncated…"); break; }
                                var kId = GetObjectId(e.Key);
                                var vId = GetObjectId(e.Value);
                                entries.Add(new
                                {
                                    key = kId != null ? (object)new { @ref = kId } : e.Key,
                                    value = vId != null ? (object)new { @ref = vId } : e.Value
                                });
                            }
                            serializedObj["_elements"] = entries;
                        }
                        else if (obj is IEnumerable enumerable)
                        {
                            var list = new List<object>();
                            int count = 0;
                            foreach (var item in enumerable)
                            {
                                if (count++ >= MaxElements) { list.Add("…truncated…"); break; }
                                var itemId = GetObjectId(item);
                                list.Add(itemId != null ? (object)new { @ref = itemId } : item);
                            }
                            serializedObj["_elements"] = list;
                        }
                        else if (type.IsValueType && (type.Namespace?.StartsWith("System") ?? false))
                        {
                            // DateTime, Guid, TimeSpan, KeyValuePair, ... — reflection over the
                            // System guard yielded nothing; a readable string is far more useful.
                            serializedObj["_value"] = obj.ToString();
                        }
                        else if (type.Namespace == null || !type.Namespace.StartsWith("System"))
                        {
                            // Deep reflect user-defined types. Script-defined classes have a
                            // null namespace, so null counts as user-defined.
                            foreach (var p in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
                            {
                                if (p.GetIndexParameters().Length > 0) continue;
                                try {
                                    var v = p.GetValue(obj);
                                    var vId = GetObjectId(v);
                                    serializedObj[p.Name] = vId != null ? (object)new { @ref = vId } : v;
                                } catch (Exception ex) { serializedObj[p.Name] = "<error: " + ex.Message + ">"; }
                            }
                            // Include private/protected fields, but skip auto-property backing
                            // fields (already surfaced via the property above).
                            foreach (var f in type.GetFields(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance))
                            {
                                if (f.Name.Contains("k__BackingField")) continue;
                                try {
                                    var v = f.GetValue(obj);
                                    var vId = GetObjectId(v);
                                    serializedObj[f.Name] = vId != null ? (object)new { @ref = vId } : v;
                                } catch (Exception ex) { serializedObj[f.Name] = "<error: " + ex.Message + ">"; }
                            }

                            EmitStatics(type);
                        }

                        heap[id] = serializedObj;
                        return id;
                    }

                    if (stateObj != null)
                    {
                        var props = stateObj.GetType().GetProperties();
                        foreach (var prop in props)
                        {
                            var val = prop.GetValue(stateObj);
                            var valId = GetObjectId(val);
                            stack[prop.Name] = valId != null ? (object)new { @ref = valId } : val ?? "null";
                        }
                    }

                    // `output` is CUMULATIVE (the frontend does no accumulation) but bounded so a
                    // chatty program can't blow memory to O(steps^2).
                    string outStr = sw.ToString();
                    if (outStr.Length > MaxOutputChars)
                        outStr = outStr.Substring(0, MaxOutputChars) + "\n…output truncated…";

                    var accessed = currentAccesses.Distinct().ToArray();
                    currentAccesses.Clear();
                    traces.Add(new TraceEvent { Step = stepCounter++, Line = line, Stack = stack, Heap = heap, Output = outStr, Accessed = accessed });
                },

                _RecIdx = (o) =>
                {
                    if (o is int i) currentAccesses.Add(i);
                    return o;
                },

                _Enter = (name, argsObj) =>
                {
                    if (callCount >= MaxCalls) return;
                    callCount++;
                    var frame = new CallNode
                    {
                        Id = callId++,
                        Name = name,
                        Args = FormatArgs(argsObj),
                        Depth = callStack.Count - 1,
                        EnterStep = stepCounter,
                    };
                    callStack.Peek().Children.Add(frame);
                    callStack.Push(frame);
                },

                _Exit = (retObj) =>
                {
                    if (callStack.Count <= 1) return; // never pop the synthetic root
                    var frame = callStack.Pop();
                    frame.ExitStep = stepCounter;
                    frame.Return = retObj == null ? null : FormatValue(retObj);
                }
            };

            // Point the static hooks at this run's closures so injected calls in
            // user-class methods (which can't reach globals) resolve.
            FacetHooks.Trace = globals._Trace;
            FacetHooks.Enter = globals._Enter;
            FacetHooks.Exit = globals._Exit;
            FacetHooks.RecIdx = globals._RecIdx;

            // Hoisted so the compile-error catch can still emit static analysis
            // (which parses fine even when imports/libraries can't be resolved).
            SyntaxNode root = null;
            AstNode ast = null;
            List<ClassInfo> classes = null;
            List<ComplexityInfo> complexity = null;

            try
            {
                var tree = CSharpSyntaxTree.ParseText(code);
                root = tree.GetRoot();

                // Static Analysis (on the ORIGINAL tree so AST line numbers are pristine).
                var analyzer = new SyntaxTreeAnalyzer();
                analyzer.Visit(root);
                ast = analyzer.Root;

                // Static class model (for the OOP lens). Collect declared type kinds
                // first so base types can be classified as base-class vs interface.
                var declaredKinds = new Dictionary<string, string>();
                foreach (var n in root.DescendantNodes())
                {
                    if (n is ClassDeclarationSyntax c) declaredKinds[c.Identifier.Text] = "class";
                    else if (n is StructDeclarationSyntax s) declaredKinds[s.Identifier.Text] = "struct";
                    else if (n is InterfaceDeclarationSyntax i) declaredKinds[i.Identifier.Text] = "interface";
                    else if (n is EnumDeclarationSyntax en) declaredKinds[en.Identifier.Text] = "enum";
                }
                var classModel = new ClassModelAnalyzer(declaredKinds);
                classModel.Visit(root);
                classes = classModel.Classes;

                // Heuristic Big-O per method (for the Complexity lens).
                var complexityAnalyzer = new ComplexityAnalyzer();
                complexityAnalyzer.Analyze(root);
                complexity = complexityAnalyzer.Methods;

                // Dynamic Injection: per-line traces first (keeps line numbers pristine),
                // then wrap method bodies with call enter/exit for the recursion lens.
                var rewriter = new TracingRewriter();
                var tracedRoot = rewriter.Visit(root);
                var accessRoot = new AccessRecorder().Visit(tracedRoot);
                var newRoot = new CallCaptureRewriter().Visit(accessRoot);
                string rewrittenCode = newRoot.ToFullString();

                var options = ScriptOptions.Default
                    .AddReferences(typeof(Enumerable).Assembly)
                    .AddReferences(typeof(FacetHooks).Assembly)   // so injected FacetHooks.* calls resolve
                    .WithImports("System", "System.Collections.Generic", "System.Linq");

                string truncReason = null;
                string runtimeError = null;

                // Hard backstop: a busy loop with no traceable statements (e.g. `while(true){}`)
                // can't be stopped by the step cap or the cancellation token, so a watchdog
                // force-terminates the process after the deadline.
                var completed = new ManualResetEventSlim(false);
                var watchdog = new Thread(() =>
                {
                    if (!completed.Wait(TimeSpan.FromSeconds(TimeoutSeconds + 2)))
                    {
                        Console.SetOut(originalOut);
                        Console.WriteLine("---FACET_JSON_START---");
                        Console.WriteLine("{\"error\":\"Execution timed out\"}");
                        Console.Out.Flush();
                        Environment.Exit(0);
                    }
                }) { IsBackground = true };
                watchdog.Start();

                using (var cts = new CancellationTokenSource(TimeSpan.FromSeconds(TimeoutSeconds)))
                {
                    try
                    {
                        await CSharpScript.RunAsync(rewrittenCode, options, globals: globals, cancellationToken: cts.Token);
                    }
                    catch (CompilationErrorException)
                    {
                        completed.Set();
                        throw; // handled below as a compile error
                    }
                    catch (TraceLimitException)
                    {
                        truncReason = "step-limit";
                    }
                    catch (OperationCanceledException)
                    {
                        truncReason = "timeout";
                    }
                    catch (Exception rex)
                    {
                        // Runtime exception in user code: keep the traces gathered so far.
                        runtimeError = rex.Message;
                    }
                }

                completed.Set();
                if (traces.Count >= MaxTraces) truncReason ??= "step-limit";

                Console.SetOut(originalOut);

                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = true,
                    Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                };

                if (runtimeError != null && traces.Count == 0)
                {
                    // Nothing ran — surface it as a plain error.
                    var errorObj = new { error = runtimeError };
                    Console.WriteLine("---FACET_JSON_START---");
                    Console.WriteLine(JsonSerializer.Serialize(errorObj, jsonOptions));
                }
                else
                {
                    // `truncated` carries timeout / step-limit / runtime-error reason without
                    // tripping the frontend's top-level `error` short-circuit, so partial
                    // traces still render.
                    var reason = truncReason ?? (runtimeError != null ? ("runtime: " + runtimeError) : null);
                    var result = new { ast = ast, traces = traces, classes = classes, callTree = callRoot.Children, complexity = complexity, truncated = reason, stdout = sw.ToString() };
                    var json = JsonSerializer.Serialize(result, jsonOptions);
                    Console.WriteLine("---FACET_JSON_START---");
                    Console.WriteLine(json);
                }
            }
            catch (CompilationErrorException e)
            {
                Console.SetOut(originalOut);
                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = true,
                    Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                };
                Console.WriteLine("---FACET_JSON_START---");
                if (ast != null && AllDependencyErrors(e.Diagnostics))
                {
                    // Code is sound except for libraries we can't resolve. Keep the static
                    // analysis so Flow/OOP/Complexity still work; flag execution as unavailable.
                    var unresolved = ExtractUnresolved(root, e.Diagnostics);
                    var result = new
                    {
                        ast,
                        traces = new List<TraceEvent>(),
                        classes,
                        callTree = new List<CallNode>(),
                        complexity,
                        unresolved,
                        truncated = "external-deps"
                    };
                    Console.WriteLine(JsonSerializer.Serialize(result, jsonOptions));
                }
                else
                {
                    var errorObj = new { error = string.Join("\n", e.Diagnostics.Where(d => d.Severity == DiagnosticSeverity.Error).Select(d => d.GetMessage())) };
                    Console.WriteLine(JsonSerializer.Serialize(errorObj, jsonOptions));
                }
            }
            catch (Exception ex)
            {
                Console.SetOut(originalOut);
                var errorObj = new { error = ex.Message };
                Console.WriteLine("---FACET_JSON_START---");
                Console.WriteLine(JsonSerializer.Serialize(errorObj));
            }
        }

        // Plain interactive execution: real stdout (auto-flushed so prompts show
        // before ReadLine blocks) and real stdin. No instrumentation, no JSON —
        // just the program's own console I/O, streamed live to the terminal UI.
        static async Task RunInteractive(string codePath)
        {
            var stdout = new StreamWriter(Console.OpenStandardOutput()) { AutoFlush = true };
            Console.SetOut(stdout);

            string src;
            try { src = await File.ReadAllTextAsync(codePath); }
            catch (Exception ex) { Console.WriteLine("Failed to read program: " + ex.Message); return; }

            var options = ScriptOptions.Default
                .AddReferences(typeof(Enumerable).Assembly)
                .WithImports("System", "System.Collections", "System.Collections.Generic", "System.Linq", "System.Text", "System.Threading", "System.Threading.Tasks");

            try
            {
                await CSharpScript.RunAsync(src, options);
            }
            catch (CompilationErrorException e)
            {
                foreach (var d in e.Diagnostics.Where(d => d.Severity == DiagnosticSeverity.Error))
                    Console.WriteLine(d.ToString());
            }
            catch (Exception e)
            {
                Console.WriteLine(e.GetType().Name + ": " + e.Message);
            }
        }
    }

    class TracingRewriter : CSharpSyntaxRewriter
    {
        private Stack<HashSet<string>> _scopes = new Stack<HashSet<string>>();

        public TracingRewriter()
        {
            _scopes.Push(new HashSet<string>());
        }

        private IEnumerable<string> GetActiveVariables()
        {
            return _scopes.SelectMany(s => s).Distinct();
        }

        private static bool IsJump(StatementSyntax s) =>
            s is ReturnStatementSyntax or BreakStatementSyntax or ContinueStatementSyntax
              or ThrowStatementSyntax or YieldStatementSyntax;

        // Builds a `FacetEngine.FacetHooks.Trace(line, new { vars });` statement, or null if nothing is in scope.
        private StatementSyntax MakeTrace(int line)
        {
            var activeVars = GetActiveVariables().ToList();
            if (activeVars.Count == 0) return null;
            string stateAnonObj = string.Join(", ", activeVars);
            string traceCall = $"FacetEngine.FacetHooks.Trace({line}, new {{ {stateAnonObj} }});";
            return SyntaxFactory.ParseStatement(traceCall).WithTrailingTrivia(SyntaxFactory.CarriageReturnLineFeed);
        }

        // Visits each statement and interleaves trace calls. For normal statements the trace
        // goes AFTER (captures resulting state); for jumps (return/break/...) it goes BEFORE,
        // otherwise it would be unreachable dead code. Line numbers come from the ORIGINAL
        // statement nodes, so they stay correct regardless of injected code.
        private List<StatementSyntax> InjectList(IEnumerable<StatementSyntax> statements)
        {
            var result = new List<StatementSyntax>();
            foreach (var statement in statements)
            {
                int line = statement.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                var visited = (StatementSyntax)Visit(statement);
                var trace = MakeTrace(line);
                if (IsJump(statement))
                {
                    if (trace != null) result.Add(trace);
                    result.Add(visited);
                }
                else
                {
                    result.Add(visited);
                    if (trace != null) result.Add(trace);
                }
            }
            return result;
        }

        // Ensures a control-flow body is a traced block, even when it was written brace-less
        // (`if (c) return x;`) — those single statements never hit VisitBlock otherwise.
        private StatementSyntax NormalizeBody(StatementSyntax body)
        {
            if (body == null) return null;
            if (body is BlockSyntax) return (StatementSyntax)Visit(body);
            return SyntaxFactory.Block(InjectList(SyntaxFactory.SingletonList(body)));
        }

        public override SyntaxNode VisitMethodDeclaration(MethodDeclarationSyntax node)
        {
            _scopes.Push(new HashSet<string>());
            foreach (var param in node.ParameterList.Parameters)
                _scopes.Peek().Add(param.Identifier.Text);
            var visited = base.VisitMethodDeclaration(node);
            _scopes.Pop();
            return visited;
        }

        public override SyntaxNode VisitLocalFunctionStatement(LocalFunctionStatementSyntax node)
        {
            _scopes.Push(new HashSet<string>());
            foreach (var param in node.ParameterList.Parameters)
                _scopes.Peek().Add(param.Identifier.Text);
            var visited = base.VisitLocalFunctionStatement(node);
            _scopes.Pop();
            return visited;
        }

        public override SyntaxNode VisitLocalDeclarationStatement(LocalDeclarationStatementSyntax node)
        {
            foreach (var variable in node.Declaration.Variables)
                _scopes.Peek().Add(variable.Identifier.Text);
            return base.VisitLocalDeclarationStatement(node);
        }

        public override SyntaxNode VisitForEachStatement(ForEachStatementSyntax node)
        {
            _scopes.Push(new HashSet<string>());
            _scopes.Peek().Add(node.Identifier.Text);
            var newBody = NormalizeBody(node.Statement);
            _scopes.Pop();
            return node.WithStatement(newBody);
        }

        public override SyntaxNode VisitForStatement(ForStatementSyntax node)
        {
            _scopes.Push(new HashSet<string>());
            if (node.Declaration != null)
                foreach (var variable in node.Declaration.Variables)
                    _scopes.Peek().Add(variable.Identifier.Text);
            var newBody = NormalizeBody(node.Statement);
            _scopes.Pop();
            return node.WithStatement(newBody);
        }

        public override SyntaxNode VisitWhileStatement(WhileStatementSyntax node)
        {
            return node.WithStatement(NormalizeBody(node.Statement));
        }

        public override SyntaxNode VisitDoStatement(DoStatementSyntax node)
        {
            return node.WithStatement(NormalizeBody(node.Statement));
        }

        public override SyntaxNode VisitIfStatement(IfStatementSyntax node)
        {
            var newStatement = NormalizeBody(node.Statement);
            var newIf = node.WithStatement(newStatement);

            if (node.Else != null)
            {
                var elseBody = node.Else.Statement;
                // `else if` — recurse so the nested if is itself normalized/traced.
                var newElseBody = elseBody is IfStatementSyntax
                    ? (StatementSyntax)Visit(elseBody)
                    : NormalizeBody(elseBody);
                newIf = newIf.WithElse(node.Else.WithStatement(newElseBody));
            }
            return newIf;
        }

        public override SyntaxNode VisitSwitchSection(SwitchSectionSyntax node)
        {
            _scopes.Push(new HashSet<string>());
            var newStatements = InjectList(node.Statements);
            _scopes.Pop();
            return node.WithStatements(SyntaxFactory.List(newStatements));
        }

        public override SyntaxNode VisitBlock(BlockSyntax node)
        {
            _scopes.Push(new HashSet<string>());
            var newStatements = InjectList(node.Statements);
            _scopes.Pop();
            return node.WithStatements(SyntaxFactory.List(newStatements));
        }

        public override SyntaxNode VisitCompilationUnit(CompilationUnitSyntax node)
        {
            var newMembers = new List<MemberDeclarationSyntax>();

            foreach (var member in node.Members)
            {
                if (member is GlobalStatementSyntax globalStatement)
                {
                    var inner = globalStatement.Statement;
                    int line = inner.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                    var visitedInner = (StatementSyntax)Visit(inner);
                    var trace = MakeTrace(line);
                    var traceGlobal = trace != null ? SyntaxFactory.GlobalStatement(trace) : null;

                    if (IsJump(inner))
                    {
                        if (traceGlobal != null) newMembers.Add(traceGlobal);
                        newMembers.Add(globalStatement.WithStatement(visitedInner));
                    }
                    else
                    {
                        newMembers.Add(globalStatement.WithStatement(visitedInner));
                        if (traceGlobal != null) newMembers.Add(traceGlobal);
                    }
                }
                else
                {
                    newMembers.Add((MemberDeclarationSyntax)Visit(member));
                }
            }

            return node.WithMembers(SyntaxFactory.List(newMembers));
        }
    }
}
