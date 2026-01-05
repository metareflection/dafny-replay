using System.Text;

namespace Dafny2Js.Emitters;

/// <summary>
/// Base class for code emitters. Contains shared logic for generating
/// type converters, helpers, and datatype constructors.
/// </summary>
public abstract class SharedEmitter
{
  protected readonly List<DatatypeInfo> Datatypes;
  protected readonly List<FunctionInfo> Functions;
  protected readonly string DomainModule;
  protected readonly string AppCoreModule;
  protected readonly string CjsFileName;
  protected readonly bool NullOptions;
  protected readonly StringBuilder Sb = new();

  protected SharedEmitter(
    List<DatatypeInfo> datatypes,
    List<FunctionInfo> functions,
    string domainModule,
    string appCoreModule,
    string cjsFileName,
    bool nullOptions = false)
  {
    Datatypes = datatypes;
    Functions = functions;
    DomainModule = domainModule;
    AppCoreModule = appCoreModule;
    CjsFileName = cjsFileName;
    NullOptions = nullOptions;
  }

  /// <summary>
  /// Generate the complete output. Implemented by subclasses.
  /// </summary>
  public abstract string Generate();

  /// <summary>
  /// Whether to emit TypeScript type annotations.
  /// </summary>
  protected virtual bool EmitTypeScript => false;

  /// <summary>
  /// Get all datatypes that need to be generated (domain + referenced).
  /// </summary>
  protected List<DatatypeInfo> GetAllTypesToGenerate()
  {
    var domainTypes = Datatypes
      .Where(dt => dt.ModuleName == DomainModule)
      .ToList();

    var referencedTypes = CollectReferencedDatatypes();

    // Find types from other modules that match referenced type names
    var candidateAdditionalTypes = Datatypes
      .Where(dt => dt.ModuleName != DomainModule && referencedTypes.Contains(dt.Name))
      .ToList();

    // Check for duplicate-named types and handle them
    var domainTypesByName = domainTypes.ToDictionary(dt => dt.Name);
    var additionalTypes = new List<DatatypeInfo>();
    var additionalTypesByName = new Dictionary<string, DatatypeInfo>();

    foreach (var candidate in candidateAdditionalTypes)
    {
      if (domainTypesByName.TryGetValue(candidate.Name, out var domainType))
      {
        if (!AreStructurallyIdentical(domainType, candidate))
        {
          throw new InvalidOperationException(
            $"Error: Duplicate datatype name '{candidate.Name}' found in modules " +
            $"'{domainType.ModuleName}' and '{candidate.ModuleName}' with different structures.");
        }
      }
      else if (additionalTypesByName.TryGetValue(candidate.Name, out var existingAdditional))
      {
        if (!AreStructurallyIdentical(existingAdditional, candidate))
        {
          throw new InvalidOperationException(
            $"Error: Duplicate datatype name '{candidate.Name}' found in modules " +
            $"'{existingAdditional.ModuleName}' and '{candidate.ModuleName}' with different structures.");
        }
      }
      else
      {
        additionalTypes.Add(candidate);
        additionalTypesByName[candidate.Name] = candidate;
      }
    }

    return domainTypes.Concat(additionalTypes).ToList();
  }

  /// <summary>
  /// Collect all datatype names referenced in function parameters and return types.
  /// </summary>
  protected HashSet<string> CollectReferencedDatatypes()
  {
    var result = new HashSet<string>();

    foreach (var func in Functions)
    {
      CollectDatatypesFromType(func.ReturnType, result);
      foreach (var param in func.Parameters)
      {
        CollectDatatypesFromType(param.Type, result);
      }
    }

    // Transitively collect datatypes from fields
    var worklist = new Queue<string>(result);
    while (worklist.Count > 0)
    {
      var typeName = worklist.Dequeue();
      var dt = Datatypes.FirstOrDefault(d => d.Name == typeName);
      if (dt == null) continue;

      foreach (var ctor in dt.Constructors)
      {
        foreach (var field in ctor.Fields)
        {
          CollectDatatypesFromTypeWithWorklist(field.Type, result, worklist);
        }
      }
    }

    return result;
  }

  void CollectDatatypesFromType(TypeRef type, HashSet<string> result)
  {
    if (type.Kind == TypeKind.Datatype)
    {
      result.Add(type.Name);
    }
    foreach (var arg in type.TypeArgs)
    {
      CollectDatatypesFromType(arg, result);
    }
  }

  void CollectDatatypesFromTypeWithWorklist(TypeRef type, HashSet<string> result, Queue<string> worklist)
  {
    if (type.Kind == TypeKind.Datatype)
    {
      if (result.Add(type.Name))
      {
        worklist.Enqueue(type.Name);
      }
    }
    foreach (var arg in type.TypeArgs)
    {
      CollectDatatypesFromTypeWithWorklist(arg, result, worklist);
    }
  }

  bool AreStructurallyIdentical(DatatypeInfo a, DatatypeInfo b)
  {
    if (a.Constructors.Count != b.Constructors.Count)
      return false;

    for (int i = 0; i < a.Constructors.Count; i++)
    {
      var ctorA = a.Constructors[i];
      var ctorB = b.Constructors[i];

      if (ctorA.Name != ctorB.Name)
        return false;

      if (ctorA.Fields.Count != ctorB.Fields.Count)
        return false;

      for (int j = 0; j < ctorA.Fields.Count; j++)
      {
        var fieldA = ctorA.Fields[j];
        var fieldB = ctorB.Fields[j];

        if (fieldA.Name != fieldB.Name)
          return false;
        if (fieldA.Type.Name != fieldB.Type.Name)
          return false;
        if (fieldA.Type.Kind != fieldB.Type.Kind)
          return false;
      }
    }

    return true;
  }

  /// <summary>
  /// Check if a datatype is "enum-like" (all constructors have no fields).
  /// </summary>
  protected bool IsEnumLike(DatatypeInfo dt)
  {
    return dt.Constructors.Count > 1 && dt.Constructors.All(c => c.Fields.Count == 0);
  }

  // =========================================================================
  // Helpers Generation
  // =========================================================================

  protected void EmitHelpers()
  {
    Sb.AppendLine("// ============================================================================");
    Sb.AppendLine("// Helpers");
    Sb.AppendLine("// ============================================================================");
    Sb.AppendLine();

    if (EmitTypeScript)
    {
      Sb.AppendLine("// deno-lint-ignore no-explicit-any");
      Sb.AppendLine("const seqToArray = (seq: any): any[] => {");
    }
    else
    {
      Sb.AppendLine("const seqToArray = (seq) => {");
    }
    Sb.AppendLine("  const arr = [];");
    Sb.AppendLine("  for (let i = 0; i < seq.length; i++) {");
    Sb.AppendLine("    arr.push(seq[i]);");
    Sb.AppendLine("  }");
    Sb.AppendLine("  return arr;");
    Sb.AppendLine("};");
    Sb.AppendLine();

    if (EmitTypeScript)
    {
      Sb.AppendLine("// deno-lint-ignore no-explicit-any");
      Sb.AppendLine("const toNumber = (bn: any): number => {");
    }
    else
    {
      Sb.AppendLine("const toNumber = (bn) => {");
    }
    Sb.AppendLine("  if (bn && typeof bn.toNumber === 'function') {");
    Sb.AppendLine("    return bn.toNumber();");
    Sb.AppendLine("  }");
    Sb.AppendLine("  return bn;");
    Sb.AppendLine("};");
    Sb.AppendLine();

    if (EmitTypeScript)
    {
      Sb.AppendLine("// deno-lint-ignore no-explicit-any");
      Sb.AppendLine("const dafnyStringToJs = (seq: any): string => {");
    }
    else
    {
      Sb.AppendLine("const dafnyStringToJs = (seq) => {");
    }
    Sb.AppendLine("  if (typeof seq === 'string') return seq;");
    Sb.AppendLine("  if (seq.toVerbatimString) return seq.toVerbatimString(false);");
    Sb.AppendLine("  return Array.from(seq).join('');");
    Sb.AppendLine("};");
    Sb.AppendLine();
  }

  // =========================================================================
  // Datatype Conversions
  // =========================================================================

  protected void EmitDatatypeConversions(List<DatatypeInfo> allTypesToGenerate)
  {
    Sb.AppendLine("// ============================================================================");
    Sb.AppendLine("// Datatype Conversions");
    Sb.AppendLine("// ============================================================================");
    Sb.AppendLine();

    foreach (var dt in allTypesToGenerate)
    {
      EmitFromJson(dt);
      Sb.AppendLine();
      EmitToJson(dt);
      Sb.AppendLine();
    }
  }

  protected void EmitFromJson(DatatypeInfo dt)
  {
    var funcName = $"{TypeMapper.SanitizeForJs(dt.Name).ToLowerInvariant()}FromJson";
    var typeParams = dt.GetTypeParams();

    var paramList = typeParams.Count > 0
      ? $"json, {string.Join(", ", typeParams.Select(p => $"{p}_fromJson"))}"
      : "json";

    if (EmitTypeScript)
    {
      Sb.AppendLine("// deno-lint-ignore no-explicit-any");
      Sb.AppendLine($"const {funcName} = ({paramList}): any => {{");
    }
    else
    {
      Sb.AppendLine($"const {funcName} = ({paramList}) => {{");
    }

    var typeParamConverters = typeParams.ToDictionary(
      p => p,
      p => $"{p}_fromJson"
    );

    if (dt.Constructors.Count == 1)
    {
      var ctor = dt.Constructors[0];
      EmitConstructorFromJson(dt, ctor, "  ", typeParamConverters);
    }
    else if (IsEnumLike(dt))
    {
      Sb.AppendLine("  switch (json) {");
      foreach (var ctor in dt.Constructors)
      {
        Sb.AppendLine($"    case '{ctor.Name}':");
        Sb.AppendLine($"      return {dt.ModuleName}.{dt.Name}.create_{ctor.Name}();");
      }
      Sb.AppendLine("    default:");
      Sb.AppendLine($"      throw new Error(`Unknown {dt.Name}: ${{json}}`);");
      Sb.AppendLine("  }");
    }
    else
    {
      Sb.AppendLine("  switch (json.type) {");
      foreach (var ctor in dt.Constructors)
      {
        Sb.AppendLine($"    case '{ctor.Name}': {{");
        EmitConstructorFromJson(dt, ctor, "      ", typeParamConverters);
        Sb.AppendLine($"    }}");
      }
      Sb.AppendLine("    default:");
      Sb.AppendLine($"      throw new Error(`Unknown {dt.Name} type: ${{json.type}}`);");
      Sb.AppendLine("  }");
    }

    Sb.AppendLine("};");
  }

  protected void EmitConstructorFromJson(DatatypeInfo dt, ConstructorInfo ctor, string indent, Dictionary<string, string> typeParamConverters)
  {
    if (ctor.Fields.Count == 0)
    {
      Sb.AppendLine($"{indent}return {dt.ModuleName}.{dt.Name}.create_{ctor.Name}();");
      return;
    }

    var args = new List<string>();
    foreach (var field in ctor.Fields)
    {
      var jsonAccess = $"json.{field.Name}";
      var converted = TypeMapper.JsonToDafny(field.Type, jsonAccess, dt.ModuleName + ".", typeParamConverters);

      if (field.Type.Kind == TypeKind.Map)
      {
        var tempVar = $"__{field.Name}";
        var mapBlock = TypeMapper.GenerateMapFromJsonBlock(
          field.Type, jsonAccess, tempVar, dt.ModuleName + ".", indent, typeParamConverters);
        Sb.AppendLine(mapBlock);
        args.Add(tempVar);
      }
      else
      {
        args.Add(converted);
      }
    }

    var argList = string.Join(",\n" + indent + "  ", args);
    Sb.AppendLine($"{indent}return {dt.ModuleName}.{dt.Name}.create_{ctor.Name}(");
    Sb.AppendLine($"{indent}  {argList}");
    Sb.AppendLine($"{indent});");
  }

  protected void EmitToJson(DatatypeInfo dt)
  {
    var funcName = $"{TypeMapper.SanitizeForJs(dt.Name).ToLowerInvariant()}ToJson";
    var typeParams = dt.GetTypeParams();

    var paramList = typeParams.Count > 0
      ? $"value, {string.Join(", ", typeParams.Select(p => $"{p}_toJson"))}"
      : "value";

    if (EmitTypeScript)
    {
      Sb.AppendLine("// deno-lint-ignore no-explicit-any");
      Sb.AppendLine($"const {funcName} = ({paramList}): any => {{");
    }
    else
    {
      Sb.AppendLine($"const {funcName} = ({paramList}) => {{");
    }

    var typeParamConverters = typeParams.ToDictionary(
      p => p,
      p => $"{p}_toJson"
    );

    if (dt.Constructors.Count == 1)
    {
      var ctor = dt.Constructors[0];
      EmitConstructorToJson(dt, ctor, "  ", false, typeParamConverters);
    }
    else if (IsEnumLike(dt))
    {
      for (int i = 0; i < dt.Constructors.Count; i++)
      {
        var ctor = dt.Constructors[i];
        var prefix = i == 0 ? "if" : "} else if";
        Sb.AppendLine($"  {prefix} (value.is_{ctor.Name}) {{");
        Sb.AppendLine($"    return '{ctor.Name}';");
      }
      Sb.AppendLine("  }");
      Sb.AppendLine("  return 'Unknown';");
    }
    else
    {
      for (int i = 0; i < dt.Constructors.Count; i++)
      {
        var ctor = dt.Constructors[i];
        var prefix = i == 0 ? "if" : "} else if";
        Sb.AppendLine($"  {prefix} (value.is_{ctor.Name}) {{");
        EmitConstructorToJson(dt, ctor, "    ", true, typeParamConverters);
      }
      Sb.AppendLine("  }");
      Sb.AppendLine("  return { type: 'Unknown' };");
    }

    Sb.AppendLine("};");
  }

  protected void EmitConstructorToJson(DatatypeInfo dt, ConstructorInfo ctor, string indent, bool includeType, Dictionary<string, string> typeParamConverters)
  {
    if (ctor.Fields.Count == 0)
    {
      if (includeType)
        Sb.AppendLine($"{indent}return {{ type: '{ctor.Name}' }};");
      else
        Sb.AppendLine($"{indent}return {{}};");
      return;
    }

    var mapFields = ctor.Fields.Where(f => f.Type.Kind == TypeKind.Map).ToList();

    foreach (var mapField in mapFields)
    {
      var dafnyAccess = $"value.dtor_{mapField.Name}";
      var tempVar = $"__{mapField.Name}Json";
      EmitMapToJsonBlock(mapField.Type, dafnyAccess, tempVar, indent, typeParamConverters);
    }

    Sb.AppendLine($"{indent}return {{");
    if (includeType)
      Sb.AppendLine($"{indent}  type: '{ctor.Name}',");

    for (int i = 0; i < ctor.Fields.Count; i++)
    {
      var field = ctor.Fields[i];
      var dafnyAccess = $"value.dtor_{field.Name}";
      string converted;

      if (field.Type.Kind == TypeKind.Map)
      {
        converted = $"__{field.Name}Json";
      }
      else
      {
        converted = TypeMapper.DafnyToJson(field.Type, dafnyAccess, DomainModule + ".", typeParamConverters);
      }

      var comma = i < ctor.Fields.Count - 1 ? "," : "";
      Sb.AppendLine($"{indent}  {field.Name}: {converted}{comma}");
    }

    Sb.AppendLine($"{indent}}};");
  }

  protected void EmitMapToJsonBlock(TypeRef mapType, string dafnyVar, string resultVar, string indent, Dictionary<string, string> typeParamConverters)
  {
    if (mapType.TypeArgs.Count < 2) return;

    var keyType = mapType.TypeArgs[0];
    var valType = mapType.TypeArgs[1];

    var keyConvert = TypeMapper.DafnyToJson(keyType, "k", DomainModule + ".", typeParamConverters);
    var valConvert = TypeMapper.DafnyToJson(valType, "v", DomainModule + ".", typeParamConverters);

    Sb.AppendLine($"{indent}const {resultVar} = {{}};");
    Sb.AppendLine($"{indent}if ({dafnyVar} && {dafnyVar}.Keys) {{");
    Sb.AppendLine($"{indent}  for (const k of {dafnyVar}.Keys.Elements) {{");
    Sb.AppendLine($"{indent}    const v = {dafnyVar}.get(k);");
    Sb.AppendLine($"{indent}    {resultVar}[{keyConvert}] = {valConvert};");
    Sb.AppendLine($"{indent}  }}");
    Sb.AppendLine($"{indent}}}");
  }

  // =========================================================================
  // API Wrapper Generation
  // =========================================================================

  protected void EmitApiWrapper()
  {
    Sb.AppendLine("// ============================================================================");
    Sb.AppendLine("// API Wrapper");
    Sb.AppendLine("// ============================================================================");
    Sb.AppendLine();
    Sb.AppendLine("const App = {");

    // Generate constructors for helper datatypes
    var helperTypes = Datatypes
      .Where(dt => dt.ModuleName == DomainModule &&
                   dt.Name != "Model" &&
                   dt.Name != "Action")
      .ToList();

    foreach (var helperType in helperTypes)
    {
      Sb.AppendLine($"  // {helperType.Name} constructors");
      foreach (var ctor in helperType.Constructors)
      {
        EmitDatatypeConstructor(helperType.Name, ctor);
      }
      Sb.AppendLine();
    }

    // Action constructors
    var actionType = Datatypes.FirstOrDefault(dt =>
      dt.ModuleName == DomainModule && dt.Name == "Action");

    if (actionType != null)
    {
      Sb.AppendLine("  // Action constructors");
      foreach (var ctor in actionType.Constructors)
      {
        EmitActionConstructor(ctor);
      }
      Sb.AppendLine();
    }

    // Model accessors
    var modelType = Datatypes.FirstOrDefault(dt =>
      dt.ModuleName == DomainModule && dt.Name == "Model");

    if (modelType != null && modelType.Constructors.Count > 0)
    {
      Sb.AppendLine("  // Model accessors");
      EmitModelAccessors(modelType);
      Sb.AppendLine();
    }

    // AppCore functions
    if (Functions.Count > 0)
    {
      var actionCtorNames = actionType?.Constructors.Select(c => c.Name).ToHashSet() ?? new HashSet<string>();
      var modelAccessorNames = modelType?.Constructors.FirstOrDefault()?.Fields
        .Select(f => "Get" + char.ToUpper(f.Name[0]) + f.Name.Substring(1))
        .ToHashSet() ?? new HashSet<string>();

      var filteredFuncs = Functions
        .Where(f => !actionCtorNames.Contains(f.Name))
        .Where(f => !modelAccessorNames.Contains(f.Name))
        .ToList();

      if (filteredFuncs.Count > 0)
      {
        Sb.AppendLine("  // AppCore functions");
        foreach (var func in filteredFuncs)
        {
          EmitFunctionWrapper(func);
        }
        Sb.AppendLine();
      }
    }

    // Conversion functions
    Sb.AppendLine("  // Conversion functions");
    var allTypesToGenerate = GetAllTypesToGenerate();
    var exportedNames = new HashSet<string>();

    foreach (var dt in allTypesToGenerate)
    {
      var lower = TypeMapper.SanitizeForJs(dt.Name).ToLowerInvariant();
      if (!exportedNames.Add(lower)) continue;
      Sb.AppendLine($"  {lower}ToJson: {lower}ToJson,");
      Sb.AppendLine($"  {lower}FromJson: {lower}FromJson,");
    }

    Sb.AppendLine("};");
    Sb.AppendLine();
  }

  protected void EmitDatatypeConstructor(string typeName, ConstructorInfo ctor)
  {
    if (ctor.Fields.Count == 0)
    {
      Sb.AppendLine($"  {ctor.Name}: () => {DomainModule}.{typeName}.create_{ctor.Name}(),");
      return;
    }

    var parms = string.Join(", ", ctor.Fields.Select(f => f.Name));
    var args = new List<string>();

    foreach (var field in ctor.Fields)
    {
      args.Add(TypeMapper.JsonToDafny(field.Type, field.Name, DomainModule + "."));
    }

    var argList = string.Join(", ", args);
    Sb.AppendLine($"  {ctor.Name}: ({parms}) => {DomainModule}.{typeName}.create_{ctor.Name}({argList}),");
  }

  protected void EmitModelAccessors(DatatypeInfo modelType)
  {
    var ctor = modelType.Constructors[0];

    foreach (var field in ctor.Fields)
    {
      var accessorName = "Get" + char.ToUpper(field.Name[0]) + field.Name.Substring(1);
      var dafnyAccess = $"m.dtor_{field.Name}";

      if (field.Type.Kind == TypeKind.Map && field.Type.TypeArgs.Count >= 2)
      {
        var keyType = field.Type.TypeArgs[0];
        var valType = field.Type.TypeArgs[1];

        var keyConvert = TypeMapper.JsonToDafny(keyType, "key", DomainModule + ".");
        var valConvert = TypeMapper.DafnyToJson(valType, "val", DomainModule + ".");

        Sb.AppendLine($"  {accessorName}: (m, key) => {{");
        Sb.AppendLine($"    const dafnyKey = {keyConvert};");
        Sb.AppendLine($"    if ({dafnyAccess}.contains(dafnyKey)) {{");
        Sb.AppendLine($"      const val = {dafnyAccess}.get(dafnyKey);");
        Sb.AppendLine($"      return {valConvert};");
        Sb.AppendLine($"    }}");
        Sb.AppendLine($"    return null;");
        Sb.AppendLine($"  }},");
      }
      else
      {
        var converted = TypeMapper.DafnyToJson(field.Type, dafnyAccess, DomainModule + ".");
        Sb.AppendLine($"  {accessorName}: (m) => {converted},");
      }
    }
  }

  protected void EmitActionConstructor(ConstructorInfo ctor)
  {
    if (ctor.Fields.Count == 0)
    {
      Sb.AppendLine($"  {ctor.Name}: () => {DomainModule}.Action.create_{ctor.Name}(),");
      return;
    }

    var parms = string.Join(", ", ctor.Fields.Select(f => f.Name));
    var args = new List<string>();

    foreach (var field in ctor.Fields)
    {
      if (field.Type.Kind == TypeKind.Datatype)
      {
        args.Add(field.Name);
      }
      else
      {
        args.Add(TypeMapper.JsonToDafny(field.Type, field.Name, DomainModule + "."));
      }
    }

    var argList = string.Join(", ", args);
    Sb.AppendLine($"  {ctor.Name}: ({parms}) => {DomainModule}.Action.create_{ctor.Name}({argList}),");
  }

  protected void EmitFunctionWrapper(FunctionInfo func)
  {
    var parms = string.Join(", ", func.Parameters.Select(p => p.Name));

    var convertedArgs = new List<string>();
    foreach (var p in func.Parameters)
    {
      if (p.Type.Kind == TypeKind.Datatype || p.Type.Kind == TypeKind.Other)
      {
        convertedArgs.Add(p.Name);
      }
      else
      {
        convertedArgs.Add(TypeMapper.JsonToDafny(p.Type, p.Name, DomainModule + "."));
      }
    }
    var argsStr = string.Join(", ", convertedArgs);

    var call = $"{AppCoreModule}.__default.{func.Name}({argsStr})";
    var returnConvert = GetReturnConversion(func.ReturnType, call);

    Sb.AppendLine($"  {func.Name}: ({parms}) => {returnConvert},");
  }

  protected string GetReturnConversion(TypeRef type, string expr)
  {
    if (type.Kind == TypeKind.Int)
      return $"toNumber({expr})";
    if (type.Kind == TypeKind.String)
      return $"dafnyStringToJs({expr})";
    if (type.Kind == TypeKind.Seq)
    {
      if (type.TypeArgs.Count > 0)
      {
        var elemConvert = TypeMapper.DafnyToJson(type.TypeArgs[0], "x", DomainModule + ".");
        if (elemConvert == "x")
          return $"seqToArray({expr})";
        return $"seqToArray({expr}).map(x => {elemConvert})";
      }
      return $"seqToArray({expr})";
    }

    return expr;
  }
}
