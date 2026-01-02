using System.Text;

namespace Dafny2Js;

/// <summary>
/// Generates the complete app.js file from extracted Dafny types.
/// </summary>
public class AppJsEmitter
{
  readonly List<DatatypeInfo> _datatypes;
  readonly List<FunctionInfo> _functions;
  readonly string _domainModule;
  readonly string _appCoreModule;
  readonly string _cjsFileName;
  readonly StringBuilder _sb = new();

  public AppJsEmitter(
    List<DatatypeInfo> datatypes,
    List<FunctionInfo> functions,
    string domainModule,
    string appCoreModule,
    string cjsFileName)
  {
    _datatypes = datatypes;
    _functions = functions;
    _domainModule = domainModule;
    _appCoreModule = appCoreModule;
    _cjsFileName = cjsFileName;
  }

  public string Generate()
  {
    _sb.Clear();

    // Collect all modules we need to import
    var allTypesToGenerate = GetAllTypesToGenerate();
    var allModules = allTypesToGenerate
      .Select(dt => dt.ModuleName)
      .Append(_domainModule)
      .Append(_appCoreModule)
      .Distinct()
      .ToList();

    // 1. Boilerplate
    _sb.AppendLine(TypeMapper.GenerateBoilerplate(_cjsFileName, allModules));
    _sb.AppendLine();

    // 2. Helpers
    _sb.AppendLine(TypeMapper.GenerateHelpers());
    _sb.AppendLine();

    // 3. Datatype conversions (toJson/fromJson for each)
    GenerateDatatypeConversions(allTypesToGenerate);

    // 4. API wrapper
    GenerateApiWrapper();

    // 5. Export internals for app-extras.js
    _sb.AppendLine("// Export internals for custom extensions");
    var internalModules = string.Join(", ", allModules);
    _sb.AppendLine($"App._internal = {{ _dafny, {internalModules} }};");
    _sb.AppendLine();

    // 6. Export
    _sb.AppendLine("export default App;");

    return _sb.ToString();
  }

  List<DatatypeInfo> GetAllTypesToGenerate()
  {
    var domainTypes = _datatypes
      .Where(dt => dt.ModuleName == _domainModule)
      .ToList();

    var referencedTypes = CollectReferencedDatatypes();

    // Find types from other modules that match referenced type names
    var candidateAdditionalTypes = _datatypes
      .Where(dt => dt.ModuleName != _domainModule && referencedTypes.Contains(dt.Name))
      .ToList();

    // Check for duplicate-named types and handle them
    var domainTypesByName = domainTypes.ToDictionary(dt => dt.Name);
    var additionalTypes = new List<DatatypeInfo>();
    var additionalTypesByName = new Dictionary<string, DatatypeInfo>();

    foreach (var candidate in candidateAdditionalTypes)
    {
      // First check against domain types
      if (domainTypesByName.TryGetValue(candidate.Name, out var domainType))
      {
        // Duplicate name found - check if structurally identical
        if (!AreStructurallyIdentical(domainType, candidate))
        {
          throw new InvalidOperationException(
            $"Error: Duplicate datatype name '{candidate.Name}' found in modules " +
            $"'{domainType.ModuleName}' and '{candidate.ModuleName}' with different structures. " +
            $"This is not supported. Consider renaming one of the types.");
        }
        // Structurally identical - skip the duplicate, use domain module's version
        Console.Error.WriteLine(
          $"Note: Skipping duplicate type '{candidate.ModuleName}.{candidate.Name}' " +
          $"(identical to '{domainType.ModuleName}.{candidate.Name}')");
      }
      // Then check against other additional types already added
      else if (additionalTypesByName.TryGetValue(candidate.Name, out var existingAdditional))
      {
        // Duplicate name found among additional types
        if (!AreStructurallyIdentical(existingAdditional, candidate))
        {
          throw new InvalidOperationException(
            $"Error: Duplicate datatype name '{candidate.Name}' found in modules " +
            $"'{existingAdditional.ModuleName}' and '{candidate.ModuleName}' with different structures. " +
            $"This is not supported. Consider renaming one of the types.");
        }
        // Structurally identical - skip the duplicate
        Console.Error.WriteLine(
          $"Note: Skipping duplicate type '{candidate.ModuleName}.{candidate.Name}' " +
          $"(identical to '{existingAdditional.ModuleName}.{candidate.Name}')");
      }
      else
      {
        // No duplicate - add to additional types
        additionalTypes.Add(candidate);
        additionalTypesByName[candidate.Name] = candidate;
      }
    }

    return domainTypes.Concat(additionalTypes).ToList();
  }

  /// <summary>
  /// Check if two datatypes are structurally identical (same constructors with same fields).
  /// </summary>
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

        // Compare types by name (both will be the base type name)
        if (fieldA.Type.Name != fieldB.Type.Name)
          return false;

        if (fieldA.Type.Kind != fieldB.Type.Kind)
          return false;
      }
    }

    return true;
  }

  void GenerateDatatypeConversions(List<DatatypeInfo> allTypesToGenerate)
  {
    _sb.AppendLine("// ============================================================================");
    _sb.AppendLine("// Datatype Conversions");
    _sb.AppendLine("// ============================================================================");
    _sb.AppendLine();

    foreach (var dt in allTypesToGenerate)
    {
      GenerateFromJson(dt);
      _sb.AppendLine();
      GenerateToJson(dt);
      _sb.AppendLine();
    }
  }

  /// <summary>
  /// Collect all datatype names that are referenced in function parameters and return types,
  /// transitively including datatypes that are fields of those datatypes.
  /// </summary>
  HashSet<string> CollectReferencedDatatypes()
  {
    var result = new HashSet<string>();

    // First pass: collect directly referenced datatypes
    foreach (var func in _functions)
    {
      CollectDatatypesFromType(func.ReturnType, result);
      foreach (var param in func.Parameters)
      {
        CollectDatatypesFromType(param.Type, result);
      }
    }

    // Second pass: transitively collect datatypes that are fields of collected datatypes
    var worklist = new Queue<string>(result);
    while (worklist.Count > 0)
    {
      var typeName = worklist.Dequeue();
      var dt = _datatypes.FirstOrDefault(d => d.Name == typeName);
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

    // Recurse into type arguments (e.g., seq<Edge> -> Edge)
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
        // Newly added - need to process its fields too
        worklist.Enqueue(type.Name);
      }
    }

    // Recurse into type arguments
    foreach (var arg in type.TypeArgs)
    {
      CollectDatatypesFromTypeWithWorklist(arg, result, worklist);
    }
  }

  /// <summary>
  /// Check if a datatype is "enum-like" (all constructors have no fields).
  /// </summary>
  bool IsEnumLike(DatatypeInfo dt)
  {
    return dt.Constructors.Count > 1 && dt.Constructors.All(c => c.Fields.Count == 0);
  }

  void GenerateFromJson(DatatypeInfo dt)
  {
    var funcName = $"{TypeMapper.SanitizeForJs(dt.Name).ToLowerInvariant()}FromJson";
    _sb.AppendLine($"const {funcName} = (json) => {{");

    if (dt.Constructors.Count == 1)
    {
      // Single constructor - no switch needed
      var ctor = dt.Constructors[0];
      GenerateConstructorFromJson(dt, ctor, "  ");
    }
    else if (IsEnumLike(dt))
    {
      // Enum-like: json is just the variant name as a string
      _sb.AppendLine("  switch (json) {");
      foreach (var ctor in dt.Constructors)
      {
        _sb.AppendLine($"    case '{ctor.Name}':");
        _sb.AppendLine($"      return {dt.ModuleName}.{dt.Name}.create_{ctor.Name}();");
      }
      _sb.AppendLine("    default:");
      _sb.AppendLine($"      throw new Error(`Unknown {dt.Name}: ${{json}}`);");
      _sb.AppendLine("  }");
    }
    else
    {
      // Multiple constructors - switch on type field
      _sb.AppendLine("  switch (json.type) {");
      foreach (var ctor in dt.Constructors)
      {
        _sb.AppendLine($"    case '{ctor.Name}':");
        GenerateConstructorFromJson(dt, ctor, "      ");
      }
      _sb.AppendLine("    default:");
      _sb.AppendLine($"      throw new Error(`Unknown {dt.Name} type: ${{json.type}}`);");
      _sb.AppendLine("  }");
    }

    _sb.AppendLine("};");
  }

  void GenerateConstructorFromJson(DatatypeInfo dt, ConstructorInfo ctor, string indent)
  {
    if (ctor.Fields.Count == 0)
    {
      _sb.AppendLine($"{indent}return {dt.ModuleName}.{dt.Name}.create_{ctor.Name}();");
      return;
    }

    // Generate field conversions
    var args = new List<string>();
    foreach (var field in ctor.Fields)
    {
      var jsonAccess = $"json.{field.Name}";
      var converted = TypeMapper.JsonToDafny(field.Type, jsonAccess, dt.ModuleName + ".");

      // Handle map types specially (need multi-line code)
      if (field.Type.Kind == TypeKind.Map)
      {
        var tempVar = $"__{field.Name}";
        var mapBlock = TypeMapper.GenerateMapFromJsonBlock(
          field.Type, jsonAccess, tempVar, dt.ModuleName + ".", indent);
        _sb.AppendLine(mapBlock);
        args.Add(tempVar);
      }
      else
      {
        args.Add(converted);
      }
    }

    var argList = string.Join(",\n" + indent + "  ", args);
    _sb.AppendLine($"{indent}return {dt.ModuleName}.{dt.Name}.create_{ctor.Name}(");
    _sb.AppendLine($"{indent}  {argList}");
    _sb.AppendLine($"{indent});");
  }

  void GenerateToJson(DatatypeInfo dt)
  {
    var funcName = $"{TypeMapper.SanitizeForJs(dt.Name).ToLowerInvariant()}ToJson";
    _sb.AppendLine($"const {funcName} = (value) => {{");

    if (dt.Constructors.Count == 1)
    {
      // Single constructor
      var ctor = dt.Constructors[0];
      GenerateConstructorToJson(dt, ctor, "  ", false);
    }
    else if (IsEnumLike(dt))
    {
      // Enum-like: return just the variant name as a string
      for (int i = 0; i < dt.Constructors.Count; i++)
      {
        var ctor = dt.Constructors[i];
        var prefix = i == 0 ? "if" : "} else if";
        _sb.AppendLine($"  {prefix} (value.is_{ctor.Name}) {{");
        _sb.AppendLine($"    return '{ctor.Name}';");
      }
      _sb.AppendLine("  }");
      _sb.AppendLine("  return 'Unknown';");
    }
    else
    {
      // Multiple constructors - check is_Ctor for each
      for (int i = 0; i < dt.Constructors.Count; i++)
      {
        var ctor = dt.Constructors[i];
        var prefix = i == 0 ? "if" : "} else if";
        _sb.AppendLine($"  {prefix} (value.is_{ctor.Name}) {{");
        GenerateConstructorToJson(dt, ctor, "    ", true);
      }
      _sb.AppendLine("  }");
      _sb.AppendLine("  return { type: 'Unknown' };");
    }

    _sb.AppendLine("};");
  }

  void GenerateConstructorToJson(DatatypeInfo dt, ConstructorInfo ctor, string indent, bool includeType)
  {
    if (ctor.Fields.Count == 0)
    {
      if (includeType)
        _sb.AppendLine($"{indent}return {{ type: '{ctor.Name}' }};");
      else
        _sb.AppendLine($"{indent}return {{}};");
      return;
    }

    // Check if any field is a map - if so, we need to pre-compute them
    var mapFields = ctor.Fields.Where(f => f.Type.Kind == TypeKind.Map).ToList();

    foreach (var mapField in mapFields)
    {
      var dafnyAccess = $"value.dtor_{mapField.Name}";
      var tempVar = $"__{mapField.Name}Json";
      GenerateMapToJsonBlock(mapField.Type, dafnyAccess, tempVar, indent);
    }

    _sb.AppendLine($"{indent}return {{");
    if (includeType)
      _sb.AppendLine($"{indent}  type: '{ctor.Name}',");

    for (int i = 0; i < ctor.Fields.Count; i++)
    {
      var field = ctor.Fields[i];
      var dafnyAccess = $"value.dtor_{field.Name}";
      string converted;

      // Handle map types specially - use pre-computed variable
      if (field.Type.Kind == TypeKind.Map)
      {
        converted = $"__{field.Name}Json";
      }
      else
      {
        converted = TypeMapper.DafnyToJson(field.Type, dafnyAccess, _domainModule + ".");
      }

      var comma = i < ctor.Fields.Count - 1 ? "," : "";
      _sb.AppendLine($"{indent}  {field.Name}: {converted}{comma}");
    }

    _sb.AppendLine($"{indent}}};");
  }

  void GenerateMapToJsonBlock(TypeRef mapType, string dafnyVar, string resultVar, string indent)
  {
    if (mapType.TypeArgs.Count < 2) return;

    var keyType = mapType.TypeArgs[0];
    var valType = mapType.TypeArgs[1];

    var keyConvert = TypeMapper.DafnyToJson(keyType, "k", _domainModule + ".");
    var valConvert = TypeMapper.DafnyToJson(valType, "v", _domainModule + ".");

    _sb.AppendLine($"{indent}const {resultVar} = {{}};");
    _sb.AppendLine($"{indent}if ({dafnyVar} && {dafnyVar}.Keys) {{");
    _sb.AppendLine($"{indent}  for (const k of {dafnyVar}.Keys.Elements) {{");
    _sb.AppendLine($"{indent}    const v = {dafnyVar}.get(k);");
    _sb.AppendLine($"{indent}    {resultVar}[{keyConvert}] = {valConvert};");
    _sb.AppendLine($"{indent}  }}");
    _sb.AppendLine($"{indent}}}");
  }

  void GenerateApiWrapper()
  {
    _sb.AppendLine("// ============================================================================");
    _sb.AppendLine("// API Wrapper");
    _sb.AppendLine("// ============================================================================");
    _sb.AppendLine();
    _sb.AppendLine("const App = {");

    // Generate constructors for all domain helper datatypes (not Model or Action)
    var helperTypes = _datatypes
      .Where(dt => dt.ModuleName == _domainModule &&
                   dt.Name != "Model" &&
                   dt.Name != "Action")
      .ToList();

    foreach (var helperType in helperTypes)
    {
      _sb.AppendLine($"  // {helperType.Name} constructors");
      foreach (var ctor in helperType.Constructors)
      {
        GenerateDatatypeConstructor(helperType.Name, ctor);
      }
      _sb.AppendLine();
    }

    // Generate action constructors from domain datatypes
    var actionType = _datatypes.FirstOrDefault(dt =>
      dt.ModuleName == _domainModule && dt.Name == "Action");

    if (actionType != null)
    {
      _sb.AppendLine("  // Action constructors");
      foreach (var ctor in actionType.Constructors)
      {
        GenerateActionConstructor(ctor);
      }
      _sb.AppendLine();
    }

    // Generate Model accessors if Model datatype exists
    var modelType = _datatypes.FirstOrDefault(dt =>
      dt.ModuleName == _domainModule && dt.Name == "Model");

    if (modelType != null && modelType.Constructors.Count > 0)
    {
      _sb.AppendLine("  // Model accessors");
      GenerateModelAccessors(modelType);
      _sb.AppendLine();
    }


    // Generate function wrappers from AppCore (excluding duplicates)
    if (_functions.Count > 0)
    {
      // Skip functions that are already generated as action constructors
      var actionCtorNames = actionType?.Constructors.Select(c => c.Name).ToHashSet() ?? new HashSet<string>();
      // Skip functions that are already generated as model accessors
      var modelAccessorNames = modelType?.Constructors.FirstOrDefault()?.Fields
        .Select(f => "Get" + char.ToUpper(f.Name[0]) + f.Name.Substring(1))
        .ToHashSet() ?? new HashSet<string>();

      var filteredFuncs = _functions
        .Where(f => !actionCtorNames.Contains(f.Name))
        .Where(f => !modelAccessorNames.Contains(f.Name))
        .ToList();

      if (filteredFuncs.Count > 0)
      {
        _sb.AppendLine("  // AppCore functions");
        foreach (var func in filteredFuncs)
        {
          GenerateFunctionWrapper(func);
        }
        _sb.AppendLine();
      }
    }

    // Add conversion functions for all generated datatypes (deduplicated by name)
    _sb.AppendLine("  // Conversion functions");
    var allTypesToGenerate = GetAllTypesToGenerate();
    var exportedNames = new HashSet<string>();

    foreach (var dt in allTypesToGenerate)
    {
      var lower = TypeMapper.SanitizeForJs(dt.Name).ToLowerInvariant();
      if (!exportedNames.Add(lower)) continue; // Skip if already exported
      _sb.AppendLine($"  {lower}ToJson: {lower}ToJson,");
      _sb.AppendLine($"  {lower}FromJson: {lower}FromJson,");
    }

    _sb.AppendLine("};");
    _sb.AppendLine();
  }

  void GenerateDatatypeConstructor(string typeName, ConstructorInfo ctor)
  {
    if (ctor.Fields.Count == 0)
    {
      _sb.AppendLine($"  {ctor.Name}: () => {_domainModule}.{typeName}.create_{ctor.Name}(),");
      return;
    }

    var parms = string.Join(", ", ctor.Fields.Select(f => f.Name));
    var args = new List<string>();

    foreach (var field in ctor.Fields)
    {
      args.Add(TypeMapper.JsonToDafny(field.Type, field.Name, _domainModule + "."));
    }

    var argList = string.Join(", ", args);
    _sb.AppendLine($"  {ctor.Name}: ({parms}) => {_domainModule}.{typeName}.create_{ctor.Name}({argList}),");
  }

  void GenerateModelAccessors(DatatypeInfo modelType)
  {
    var ctor = modelType.Constructors[0]; // Model typically has one constructor

    foreach (var field in ctor.Fields)
    {
      var accessorName = "Get" + char.ToUpper(field.Name[0]) + field.Name.Substring(1);
      var dafnyAccess = $"m.dtor_{field.Name}";

      // Handle map fields specially - provide lookup functions instead of raw conversion
      if (field.Type.Kind == TypeKind.Map && field.Type.TypeArgs.Count >= 2)
      {
        var keyType = field.Type.TypeArgs[0];
        var valType = field.Type.TypeArgs[1];

        // Generate a lookup function: GetX(m, key) => value
        var keyConvert = TypeMapper.JsonToDafny(keyType, "key", _domainModule + ".");
        var valConvert = TypeMapper.DafnyToJson(valType, "val", _domainModule + ".");

        _sb.AppendLine($"  {accessorName}: (m, key) => {{");
        _sb.AppendLine($"    const dafnyKey = {keyConvert};");
        _sb.AppendLine($"    if ({dafnyAccess}.contains(dafnyKey)) {{");
        _sb.AppendLine($"      const val = {dafnyAccess}.get(dafnyKey);");
        _sb.AppendLine($"      return {valConvert};");
        _sb.AppendLine($"    }}");
        _sb.AppendLine($"    return null;");
        _sb.AppendLine($"  }},");
      }
      else
      {
        var converted = TypeMapper.DafnyToJson(field.Type, dafnyAccess, _domainModule + ".");
        _sb.AppendLine($"  {accessorName}: (m) => {converted},");
      }
    }
  }


  void GenerateActionConstructor(ConstructorInfo ctor)
  {
    if (ctor.Fields.Count == 0)
    {
      _sb.AppendLine($"  {ctor.Name}: () => {_domainModule}.Action.create_{ctor.Name}(),");
      return;
    }

    var parms = string.Join(", ", ctor.Fields.Select(f => f.Name));
    var args = new List<string>();

    foreach (var field in ctor.Fields)
    {
      // For Datatype fields (like Place), pass through as-is - caller provides Dafny object
      if (field.Type.Kind == TypeKind.Datatype)
      {
        args.Add(field.Name);
      }
      else
      {
        args.Add(TypeMapper.JsonToDafny(field.Type, field.Name, _domainModule + "."));
      }
    }

    var argList = string.Join(", ", args);
    _sb.AppendLine($"  {ctor.Name}: ({parms}) => {_domainModule}.Action.create_{ctor.Name}({argList}),");
  }

  void GenerateFunctionWrapper(FunctionInfo func)
  {
    var parms = string.Join(", ", func.Parameters.Select(p => p.Name));

    // Convert parameters to Dafny types (except Datatypes which are passed as-is)
    var convertedArgs = new List<string>();
    foreach (var p in func.Parameters)
    {
      // Datatype parameters are already Dafny objects - pass through as-is
      if (p.Type.Kind == TypeKind.Datatype || p.Type.Kind == TypeKind.Other)
      {
        convertedArgs.Add(p.Name);
      }
      else
      {
        convertedArgs.Add(TypeMapper.JsonToDafny(p.Type, p.Name, _domainModule + "."));
      }
    }
    var argsStr = string.Join(", ", convertedArgs);

    var call = $"{_appCoreModule}.__default.{func.Name}({argsStr})";

    // Check if return type needs conversion
    var returnConvert = GetReturnConversion(func.ReturnType, call);

    _sb.AppendLine($"  {func.Name}: ({parms}) => {returnConvert},");
  }

  string GetReturnConversion(TypeRef type, string expr)
  {
    // For simple types that users will want as JS values
    if (type.Kind == TypeKind.Int)
      return $"toNumber({expr})";
    if (type.Kind == TypeKind.String)
      return $"dafnyStringToJs({expr})";
    if (type.Kind == TypeKind.Seq)
    {
      // Convert seq to array, and convert elements
      if (type.TypeArgs.Count > 0)
      {
        var elemConvert = TypeMapper.DafnyToJson(type.TypeArgs[0], "x", _domainModule + ".");
        if (elemConvert == "x")
          return $"seqToArray({expr})";
        return $"seqToArray({expr}).map(x => {elemConvert})";
      }
      return $"seqToArray({expr})";
    }

    // For datatypes and complex types, return as-is (user can call toJson if needed)
    return expr;
  }
}
