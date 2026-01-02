using Microsoft.Dafny;

namespace Dafny2Js;

/// <summary>
/// Represents a Dafny datatype with its constructors and fields.
/// </summary>
public record DatatypeInfo(
  string ModuleName,
  string Name,
  string FullName,
  List<ConstructorInfo> Constructors
);

/// <summary>
/// Represents a constructor of a Dafny datatype.
/// </summary>
public record ConstructorInfo(
  string Name,
  List<FieldInfo> Fields
);

/// <summary>
/// Represents a field (formal parameter) of a constructor.
/// </summary>
public record FieldInfo(
  string Name,
  TypeRef Type
);

/// <summary>
/// Represents a reference to a Dafny type, with enough info for JS conversion.
/// </summary>
public record TypeRef(
  TypeKind Kind,
  string Name,
  List<TypeRef> TypeArgs
)
{
  public override string ToString()
  {
    if (TypeArgs.Count == 0) return Name;
    return $"{Name}<{string.Join(", ", TypeArgs)}>";
  }
}

public enum TypeKind
{
  Int,        // int, nat
  Bool,
  String,
  Seq,        // seq<T>
  Set,        // set<T>
  Map,        // map<K,V>
  Tuple,      // (T1, T2, ...) - Dafny tuples
  Datatype,   // user-defined datatype
  TypeParam,  // generic type parameter
  Other       // anything else
}

/// <summary>
/// Extracts datatype information from a parsed Dafny program.
/// </summary>
public static class TypeExtractor
{
  /// <summary>
  /// Extract all datatypes from the program, organized by module.
  /// </summary>
  public static List<DatatypeInfo> ExtractDatatypes(Microsoft.Dafny.Program program)
  {
    var result = new List<DatatypeInfo>();

    foreach (var module in program.Modules())
    {
      // Skip abstract modules - they don't appear in compiled JavaScript
      if (module.ModuleKind == ModuleKindEnum.Abstract)
        continue;

      foreach (var decl in module.TopLevelDecls)
      {
        if (decl is IndDatatypeDecl dt)
        {
          var info = ExtractDatatype(module.Name, dt);
          result.Add(info);
        }
      }
    }

    return result;
  }

  /// <summary>
  /// Extract all datatypes from a specific module.
  /// </summary>
  public static List<DatatypeInfo> ExtractDatatypesFromModule(
    Microsoft.Dafny.Program program,
    string moduleName)
  {
    var result = new List<DatatypeInfo>();

    foreach (var module in program.Modules())
    {
      if (module.Name != moduleName) continue;

      foreach (var decl in module.TopLevelDecls)
      {
        if (decl is IndDatatypeDecl dt)
        {
          var info = ExtractDatatype(module.Name, dt);
          result.Add(info);
        }
      }
    }

    return result;
  }

  /// <summary>
  /// Extract info from a single datatype declaration.
  /// </summary>
  static DatatypeInfo ExtractDatatype(string moduleName, IndDatatypeDecl dt)
  {
    var constructors = new List<ConstructorInfo>();

    foreach (var ctor in dt.Ctors)
    {
      var fields = new List<FieldInfo>();
      foreach (var formal in ctor.Formals)
      {
        if (formal.IsGhost) continue; // Skip ghost fields

        var typeRef = TypeToRef(formal.Type);
        fields.Add(new FieldInfo(formal.Name, typeRef));
      }
      constructors.Add(new ConstructorInfo(ctor.Name, fields));
    }

    var fullName = moduleName == "_module"
      ? dt.Name
      : $"{moduleName}.{dt.Name}";

    return new DatatypeInfo(moduleName, dt.Name, fullName, constructors);
  }

  /// <summary>
  /// Convert a Dafny Type to a TypeRef for code generation.
  /// </summary>
  public static TypeRef TypeToRef(Microsoft.Dafny.Type type)
  {
    // Normalize the type (resolve type synonyms, etc.)
    type = type.NormalizeExpandKeepConstraints();

    // Handle built-in types
    if (type is IntType)
    {
      return new TypeRef(TypeKind.Int, "int", []);
    }

    // Handle nat (which is a subset type of int in Dafny)
    var typeName = type.ToString();
    if (typeName == "nat" || typeName == "int")
    {
      return new TypeRef(TypeKind.Int, typeName, []);
    }
    if (type is BoolType)
    {
      return new TypeRef(TypeKind.Bool, "bool", []);
    }
    if (type is CharType)
    {
      return new TypeRef(TypeKind.String, "char", []);
    }
    if (type is RealType)
    {
      return new TypeRef(TypeKind.Other, "real", []);
    }

    // Handle string (seq<char>)
    if (type is SeqType seqType && seqType.Arg is CharType)
    {
      return new TypeRef(TypeKind.String, "string", []);
    }

    // Handle seq<T>
    if (type is SeqType seq)
    {
      var elemType = TypeToRef(seq.Arg);
      return new TypeRef(TypeKind.Seq, "seq", [elemType]);
    }

    // Handle set<T>
    if (type is SetType set)
    {
      var elemType = TypeToRef(set.Arg);
      return new TypeRef(TypeKind.Set, "set", [elemType]);
    }

    // Handle map<K,V>
    if (type is MapType map)
    {
      var keyType = TypeToRef(map.Domain);
      var valType = TypeToRef(map.Range);
      return new TypeRef(TypeKind.Map, "map", [keyType, valType]);
    }

    // Handle user-defined types (datatypes, classes, etc.)
    if (type is UserDefinedType udt)
    {
      // Check if it's a type parameter
      if (udt.ResolvedClass is TypeParameter)
      {
        return new TypeRef(TypeKind.TypeParam, udt.Name, []);
      }

      // Check if it's a tuple type (like _tuple#2, _System.Tuple2, etc.)
      if (udt.ResolvedClass is TupleTypeDecl ||
          udt.Name.StartsWith("_tuple#") ||
          udt.Name.StartsWith("Tuple") ||
          udt.Name.Contains(".Tuple"))
      {
        var typeArgs = udt.TypeArgs.Select(TypeToRef).ToList();
        // Name includes arity, e.g., "Tuple2" for pairs
        return new TypeRef(TypeKind.Tuple, $"Tuple{typeArgs.Count}", typeArgs);
      }

      // Check if it's a datatype
      if (udt.ResolvedClass is DatatypeDecl)
      {
        var typeArgs = udt.TypeArgs.Select(TypeToRef).ToList();
        return new TypeRef(TypeKind.Datatype, udt.Name, typeArgs);
      }

      // Other user-defined types
      var args = udt.TypeArgs.Select(TypeToRef).ToList();
      return new TypeRef(TypeKind.Other, udt.Name, args);
    }

    // Fallback
    return new TypeRef(TypeKind.Other, type.ToString(), []);
  }

  /// <summary>
  /// Find all functions in a module (for extracting AppCore API).
  /// </summary>
  public static List<FunctionInfo> ExtractFunctions(
    Microsoft.Dafny.Program program,
    string moduleName)
  {
    var result = new List<FunctionInfo>();

    foreach (var module in program.Modules())
    {
      if (module.Name != moduleName) continue;

      foreach (var decl in module.TopLevelDecls)
      {
        // Module-level functions are in the default class (named "_default")
        if (decl is DefaultClassDecl defaultClass)
        {
          foreach (var member in defaultClass.Members)
          {
            if (member is Function func && !func.IsGhost)
            {
              var returnType = TypeToRef(func.ResultType);
              var parameters = func.Ins
                .Where(p => !p.IsGhost)
                .Select(p => new FieldInfo(p.Name, TypeToRef(p.Type)))
                .ToList();

              result.Add(new FunctionInfo(func.Name, parameters, returnType));
            }
          }
        }
        // Also check other TopLevelDeclWithMembers (classes, etc.)
        else if (decl is TopLevelDeclWithMembers memberDecl)
        {
          foreach (var member in memberDecl.Members)
          {
            if (member is Function func && !func.IsGhost)
            {
              var returnType = TypeToRef(func.ResultType);
              var parameters = func.Ins
                .Where(p => !p.IsGhost)
                .Select(p => new FieldInfo(p.Name, TypeToRef(p.Type)))
                .ToList();

              result.Add(new FunctionInfo(func.Name, parameters, returnType));
            }
          }
        }
      }
    }

    return result;
  }
}

/// <summary>
/// Represents a function in the AppCore module.
/// </summary>
public record FunctionInfo(
  string Name,
  List<FieldInfo> Parameters,
  TypeRef ReturnType
);
