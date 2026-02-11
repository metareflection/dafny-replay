using Microsoft.Dafny;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Dafny2Js;

/// <summary>
/// Represents a predicate (invariant) extracted from Dafny code.
/// </summary>
public record PredicateInfo(
  string Name,
  string Module,
  string? Body,
  List<string>? Conjuncts,
  int Line,
  bool IsGhost
);

/// <summary>
/// Represents a lemma extracted from Dafny code.
/// </summary>
public record LemmaInfo(
  string Name,
  string Module,
  List<string> Requires,
  List<string> Ensures,
  int Line
);

/// <summary>
/// Represents a function with its contracts.
/// </summary>
public record FunctionContractInfo(
  string Name,
  string Module,
  List<string> Requires,
  List<string> Ensures,
  int Line
);

/// <summary>
/// Represents an axiom (assume {:axiom}) found in the code.
/// </summary>
public record AxiomInfo(
  string Content,
  string File,
  string Module,
  int Line
);

/// <summary>
/// The complete claims extraction result.
/// </summary>
public record ClaimsResult(
  List<PredicateInfo> Predicates,
  List<LemmaInfo> Lemmas,
  List<FunctionContractInfo> Functions,
  List<AxiomInfo> Axioms
);

/// <summary>
/// Extracts proof-related claims from a parsed Dafny program.
/// </summary>
public static class ClaimsExtractor
{
  /// <summary>
  /// Extract all claims (predicates, lemmas, function contracts, axioms) from the program.
  /// </summary>
  public static ClaimsResult ExtractClaims(Microsoft.Dafny.Program program)
  {
    var predicates = new List<PredicateInfo>();
    var lemmas = new List<LemmaInfo>();
    var functions = new List<FunctionContractInfo>();
    var axioms = new List<AxiomInfo>();

    foreach (var module in program.Modules())
    {
      // Skip system modules
      if (module.Name.StartsWith("_") || module.Name == "System")
        continue;

      foreach (var decl in module.TopLevelDecls)
      {
        ExtractFromDecl(module.Name, decl, predicates, lemmas, functions, axioms);
      }
    }

    return new ClaimsResult(predicates, lemmas, functions, axioms);
  }

  private static void ExtractFromDecl(
    string moduleName,
    TopLevelDecl decl,
    List<PredicateInfo> predicates,
    List<LemmaInfo> lemmas,
    List<FunctionContractInfo> functions,
    List<AxiomInfo> axioms)
  {
    // Handle classes and other member containers
    if (decl is TopLevelDeclWithMembers memberDecl)
    {
      foreach (var member in memberDecl.Members)
      {
        // Extract predicates
        if (member is Predicate pred)
        {
          var bodyStr = pred.Body?.ToString();
          var conjuncts = pred.Body != null ? ExtractConjuncts(pred.Body) : null;
          var line = GetLine(pred.Origin);

          predicates.Add(new PredicateInfo(
            pred.Name,
            moduleName,
            bodyStr,
            conjuncts,
            line,
            pred.IsGhost
          ));

          // Also check for axioms in predicate attributes
          CheckForAxiomAttribute(pred, moduleName, axioms);
        }
        // Extract lemmas
        else if (member is Lemma lemma)
        {
          var requires = lemma.Req.Select(r => r.E.ToString()).ToList();
          var ensures = lemma.Ens.Select(e => e.E.ToString()).ToList();
          var line = GetLine(lemma.Origin);

          // Check if lemma has {:axiom} attribute (assumed, not proven)
          var isAxiom = HasAxiomAttribute(lemma);

          lemmas.Add(new LemmaInfo(
            lemma.Name,
            moduleName,
            requires,
            ensures,
            line
          ));

          // If lemma has {:axiom}, also add to axioms list
          if (isAxiom)
          {
            var ensuresStr = string.Join(", ", ensures);
            axioms.Add(new AxiomInfo(
              $"lemma {lemma.Name} ensures {ensuresStr}",
              GetFile(lemma.Origin),
              moduleName,
              line
            ));
          }

          // Check for axioms in lemma body
          if (lemma.Body != null)
          {
            ExtractAxiomsFromStatement(lemma.Body, moduleName, axioms);
          }
        }
        // Extract function contracts (non-predicate functions)
        else if (member is Function func && member is not Predicate)
        {
          // Only include if it has requires or ensures
          if (func.Req.Count > 0 || func.Ens.Count > 0)
          {
            var requires = func.Req.Select(r => r.E.ToString()).ToList();
            var ensures = func.Ens.Select(e => e.E.ToString()).ToList();
            var line = GetLine(func.Origin);

            functions.Add(new FunctionContractInfo(
              func.Name,
              moduleName,
              requires,
              ensures,
              line
            ));
          }

          // Check for axiom attribute on function
          CheckForAxiomAttribute(func, moduleName, axioms);
        }
        // Extract method contracts and check for axioms
        else if (member is Method method && member is not Lemma)
        {
          // Check method body for assume statements with axiom attribute
          if (method.Body != null)
          {
            ExtractAxiomsFromStatement(method.Body, moduleName, axioms);
          }
        }
      }
    }
  }

  private static bool HasAxiomAttribute(MemberDecl member)
  {
    var attrs = member.Attributes;
    while (attrs != null)
    {
      if (attrs.Name == "axiom")
        return true;
      attrs = attrs.Prev;
    }
    return false;
  }

  private static void CheckForAxiomAttribute(MemberDecl member, string moduleName, List<AxiomInfo> axioms)
  {
    // Check if the member has {:axiom} attribute
    if (!HasAxiomAttribute(member)) return;

    var line = GetLine(member.Origin);
    var content = member switch
    {
      Predicate p => $"predicate {p.Name}",
      Function f => $"function {f.Name}: {f.ResultType}",
      _ => member.Name
    };

    axioms.Add(new AxiomInfo(
      content,
      GetFile(member.Origin),
      moduleName,
      line
    ));
  }

  private static void ExtractAxiomsFromStatement(Statement stmt, string moduleName, List<AxiomInfo> axioms)
  {
    // Look for assume statements with {:axiom} attribute
    if (stmt is AssumeStmt assumeStmt)
    {
      var attrs = assumeStmt.Attributes;
      while (attrs != null)
      {
        if (attrs.Name == "axiom")
        {
          var line = GetLine(assumeStmt.Origin);
          var content = $"assume {{:axiom}} {assumeStmt.Expr}";

          axioms.Add(new AxiomInfo(
            content,
            GetFile(assumeStmt.Origin),
            moduleName,
            line
          ));
          break;
        }
        attrs = attrs.Prev;
      }
    }

    // Recursively check sub-statements
    foreach (var sub in stmt.SubStatements)
    {
      ExtractAxiomsFromStatement(sub, moduleName, axioms);
    }
  }

  /// <summary>
  /// Extract conjuncts from an expression by splitting on && (And operator).
  /// </summary>
  private static List<string>? ExtractConjuncts(Expression expr)
  {
    var conjuncts = new List<Expression>();
    CollectConjuncts(expr, conjuncts);

    if (conjuncts.Count == 0)
      return null;

    return conjuncts.Select(e => e.ToString()).ToList();
  }

  /// <summary>
  /// Recursively collect conjuncts by walking BinaryExpr with And operator.
  /// </summary>
  private static void CollectConjuncts(Expression expr, List<Expression> result)
  {
    if (expr is BinaryExpr binary && binary.Op == BinaryExpr.Opcode.And)
    {
      // Recursively collect from both sides
      CollectConjuncts(binary.E0, result);
      CollectConjuncts(binary.E1, result);
    }
    else
    {
      // Base case: not an And expression, add as a conjunct
      result.Add(expr);
    }
  }

  private static int GetLine(IOrigin? origin)
  {
    if (origin == null) return 0;
    return origin.Center.line;
  }

  private static string GetFile(IOrigin? origin)
  {
    if (origin == null) return "";
    return origin.Filepath ?? "";
  }

  /// <summary>
  /// Serialize claims to JSON.
  /// </summary>
  public static string ToJson(ClaimsResult claims)
  {
    var options = new JsonSerializerOptions
    {
      WriteIndented = true,
      PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
      DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    return JsonSerializer.Serialize(claims, options);
  }
}
