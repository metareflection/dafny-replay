namespace Dafny2Js;

/// <summary>
/// Generates JavaScript code snippets for converting between Dafny types and JSON.
/// </summary>
public static class TypeMapper
{
  /// <summary>
  /// Sanitize a type name to be a valid JavaScript identifier.
  /// Replaces characters like # with underscores.
  /// </summary>
  public static string SanitizeForJs(string name)
  {
    // Replace # with _ (for tuple types like _tuple#2)
    return name.Replace("#", "_");
  }
  /// <summary>
  /// Generate JS code to convert a JSON value to a Dafny value.
  /// </summary>
  /// <param name="type">The Dafny type</param>
  /// <param name="jsVar">The JavaScript variable name containing the JSON value</param>
  /// <param name="moduleName">The Dafny module name (for datatype constructors)</param>
  /// <returns>JavaScript expression that produces the Dafny value</returns>
  public static string JsonToDafny(TypeRef type, string jsVar, string moduleName = "")
  {
    return type.Kind switch
    {
      TypeKind.Int => $"new BigNumber({jsVar})",
      TypeKind.Bool => jsVar,
      TypeKind.String => $"_dafny.Seq.UnicodeFromString({jsVar})",
      TypeKind.Seq => JsonToDafnySeq(type, jsVar, moduleName),
      TypeKind.Set => JsonToDafnySet(type, jsVar, moduleName),
      TypeKind.Map => JsonToDafnyMap(type, jsVar, moduleName),
      TypeKind.Tuple => JsonToDafnyTuple(type, jsVar, moduleName),
      // Use local function name (lowercase) for nested datatype conversion
      // Sanitize the name to handle tuple types like _tuple#2
      TypeKind.Datatype => $"{SanitizeForJs(type.Name).ToLowerInvariant()}FromJson({jsVar})",
      TypeKind.TypeParam => jsVar, // Generic - caller handles
      _ => jsVar
    };
  }

  /// <summary>
  /// Generate JS code to convert a Dafny value to JSON.
  /// </summary>
  /// <param name="type">The Dafny type</param>
  /// <param name="dafnyVar">The JavaScript variable name containing the Dafny value</param>
  /// <param name="moduleName">The Dafny module name (for datatype converters)</param>
  /// <returns>JavaScript expression that produces the JSON value</returns>
  public static string DafnyToJson(TypeRef type, string dafnyVar, string moduleName = "")
  {
    return type.Kind switch
    {
      TypeKind.Int => $"toNumber({dafnyVar})",
      TypeKind.Bool => dafnyVar,
      TypeKind.String => $"dafnyStringToJs({dafnyVar})",
      TypeKind.Seq => DafnyToJsonSeq(type, dafnyVar, moduleName),
      TypeKind.Set => DafnyToJsonSet(type, dafnyVar, moduleName),
      TypeKind.Map => DafnyToJsonMap(type, dafnyVar, moduleName),
      TypeKind.Tuple => DafnyToJsonTuple(type, dafnyVar, moduleName),
      // Use local function name (lowercase) for nested datatype conversion
      // Sanitize the name to handle tuple types like _tuple#2
      TypeKind.Datatype => $"{SanitizeForJs(type.Name).ToLowerInvariant()}ToJson({dafnyVar})",
      TypeKind.TypeParam => dafnyVar, // Generic - caller handles
      _ => dafnyVar
    };
  }

  /// <summary>
  /// Generate JS code for a Dafny action/datatype constructor call.
  /// </summary>
  public static string ConstructorCall(
    string moduleName,
    string typeName,
    string ctorName,
    IEnumerable<string> args)
  {
    var argList = string.Join(", ", args);
    return $"{moduleName}.{typeName}.create_{ctorName}({argList})";
  }

  /// <summary>
  /// Generate JS code to check if a value is a specific constructor variant.
  /// </summary>
  public static string IsVariant(string dafnyVar, string ctorName)
  {
    return $"{dafnyVar}.is_{ctorName}";
  }

  /// <summary>
  /// Generate JS code to access a destructor (field) of a datatype.
  /// </summary>
  public static string Destructor(string dafnyVar, string fieldName)
  {
    return $"{dafnyVar}.dtor_{fieldName}";
  }

  // =========================================================================
  // Sequence conversions
  // =========================================================================

  static string JsonToDafnySeq(TypeRef type, string jsVar, string moduleName)
  {
    if (type.TypeArgs.Count == 0)
      return $"_dafny.Seq.of(...{jsVar})";

    var elemType = type.TypeArgs[0];
    var elemConvert = JsonToDafny(elemType, "x", moduleName);

    // Optimization: if element conversion is just "x", no map needed
    if (elemConvert == "x")
      return $"_dafny.Seq.of(...{jsVar})";

    return $"_dafny.Seq.of(...({jsVar} || []).map(x => {elemConvert}))";
  }

  static string DafnyToJsonSeq(TypeRef type, string dafnyVar, string moduleName)
  {
    if (type.TypeArgs.Count == 0)
      return $"seqToArray({dafnyVar})";

    var elemType = type.TypeArgs[0];
    var elemConvert = DafnyToJson(elemType, "x", moduleName);

    // Optimization: if element conversion is just "x", no map needed
    if (elemConvert == "x")
      return $"seqToArray({dafnyVar})";

    return $"seqToArray({dafnyVar}).map(x => {elemConvert})";
  }

  // =========================================================================
  // Set conversions
  // =========================================================================

  static string JsonToDafnySet(TypeRef type, string jsVar, string moduleName)
  {
    if (type.TypeArgs.Count == 0)
      return $"_dafny.Set.fromElements(...{jsVar})";

    var elemType = type.TypeArgs[0];
    var elemConvert = JsonToDafny(elemType, "x", moduleName);

    if (elemConvert == "x")
      return $"_dafny.Set.fromElements(...{jsVar})";

    return $"_dafny.Set.fromElements(...({jsVar} || []).map(x => {elemConvert}))";
  }

  static string DafnyToJsonSet(TypeRef type, string dafnyVar, string moduleName)
  {
    if (type.TypeArgs.Count == 0)
      return $"Array.from({dafnyVar}.Elements)";

    var elemType = type.TypeArgs[0];
    var elemConvert = DafnyToJson(elemType, "x", moduleName);

    if (elemConvert == "x")
      return $"Array.from({dafnyVar}.Elements)";

    return $"Array.from({dafnyVar}.Elements).map(x => {elemConvert})";
  }

  // =========================================================================
  // Tuple conversions
  // =========================================================================

  static string JsonToDafnyTuple(TypeRef type, string jsVar, string moduleName)
  {
    // Dafny tuples are accessed as arrays: [elem0, elem1, ...]
    // Dafny Tuple constructor: _dafny.Tuple.create_<N>(e0, e1, ...)
    var arity = type.TypeArgs.Count;
    if (arity == 0)
      return jsVar;

    var args = new List<string>();
    for (int i = 0; i < arity; i++)
    {
      var elemType = type.TypeArgs[i];
      var elemConvert = JsonToDafny(elemType, $"{jsVar}[{i}]", moduleName);
      args.Add(elemConvert);
    }

    return $"_dafny.Tuple.create_{arity}({string.Join(", ", args)})";
  }

  static string DafnyToJsonTuple(TypeRef type, string dafnyVar, string moduleName)
  {
    // Dafny tuples have __hd_0, __hd_1, etc. accessors, but also [0], [1] works
    var arity = type.TypeArgs.Count;
    if (arity == 0)
      return dafnyVar;

    var elems = new List<string>();
    for (int i = 0; i < arity; i++)
    {
      var elemType = type.TypeArgs[i];
      var elemConvert = DafnyToJson(elemType, $"{dafnyVar}[{i}]", moduleName);
      elems.Add(elemConvert);
    }

    return $"[{string.Join(", ", elems)}]";
  }

  // =========================================================================
  // Map conversions
  // =========================================================================

  static string JsonToDafnyMap(TypeRef type, string jsVar, string moduleName)
  {
    // Generate an IIFE to convert JS object to Dafny map
    if (type.TypeArgs.Count < 2)
      return "_dafny.Map.Empty";

    var keyType = type.TypeArgs[0];
    var valType = type.TypeArgs[1];
    var keyConvert = JsonToDafny(keyType, "k", moduleName);
    var valConvert = JsonToDafny(valType, "v", moduleName);

    return $"((obj) => {{ let m = _dafny.Map.Empty; for (const [k, v] of Object.entries(obj || {{}})) {{ m = m.update({keyConvert}, {valConvert}); }} return m; }})({jsVar})";
  }

  static string DafnyToJsonMap(TypeRef type, string dafnyVar, string moduleName)
  {
    // Generate an IIFE to convert Dafny map to JS object
    if (type.TypeArgs.Count < 2)
      return "{}";

    var keyType = type.TypeArgs[0];
    var valType = type.TypeArgs[1];
    var keyConvert = DafnyToJson(keyType, "k", moduleName);
    var valConvert = DafnyToJson(valType, "v", moduleName);

    return $"((dm) => {{ const obj = {{}}; if (dm && dm.Keys) {{ for (const k of dm.Keys.Elements) {{ obj[{keyConvert}] = {valConvert.Replace("v", "dm.get(k)")}; }} }} return obj; }})({dafnyVar})";
  }

  // =========================================================================
  // Code block generators (for complex conversions)
  // =========================================================================

  /// <summary>
  /// Generate a complete function body for converting a map from JSON.
  /// </summary>
  public static string GenerateMapFromJsonBlock(
    TypeRef mapType,
    string jsVar,
    string resultVar,
    string moduleName,
    string indent = "  ")
  {
    if (mapType.TypeArgs.Count < 2)
      return $"{indent}let {resultVar} = _dafny.Map.Empty;";

    var keyType = mapType.TypeArgs[0];
    var valType = mapType.TypeArgs[1];

    var keyConvert = JsonToDafny(keyType, "k", moduleName);
    var valConvert = JsonToDafny(valType, "v", moduleName);

    return $@"{indent}let {resultVar} = _dafny.Map.Empty;
{indent}for (const [k, v] of Object.entries({jsVar} || {{}})) {{
{indent}  const key = {keyConvert};
{indent}  const val = {valConvert};
{indent}  {resultVar} = {resultVar}.update(key, val);
{indent}}}";
  }

  /// <summary>
  /// Generate a complete function body for converting a map to JSON.
  /// </summary>
  public static string GenerateMapToJsonBlock(
    TypeRef mapType,
    string dafnyVar,
    string resultVar,
    string moduleName,
    string indent = "  ")
  {
    if (mapType.TypeArgs.Count < 2)
      return $"{indent}const {resultVar} = {{}};";

    var keyType = mapType.TypeArgs[0];
    var valType = mapType.TypeArgs[1];

    var keyConvert = DafnyToJson(keyType, "k", moduleName);
    var valConvert = DafnyToJson(valType, "v", moduleName);

    return $@"{indent}const {resultVar} = {{}};
{indent}if ({dafnyVar} && {dafnyVar}.Keys) {{
{indent}  for (const k of {dafnyVar}.Keys.Elements) {{
{indent}    const v = {dafnyVar}.get(k);
{indent}    {resultVar}[{keyConvert}] = {valConvert};
{indent}  }}
{indent}}}";
  }

  // =========================================================================
  // Helpers for generating conversion functions
  // =========================================================================

  /// <summary>
  /// Generate the helpers that are common to all app.js files.
  /// </summary>
  public static string GenerateHelpers()
  {
    return @"// ============================================================================
// Helpers
// ============================================================================

// Convert Dafny seq to JS array
const seqToArray = (seq) => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// Convert BigNumber to JS number
const toNumber = (bn) => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// Convert Dafny string to JS string
const dafnyStringToJs = (seq) => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};";
  }

  /// <summary>
  /// Generate the boilerplate code at the top of app.js.
  /// </summary>
  public static string GenerateBoilerplate(string cjsFileName, IEnumerable<string> moduleNames)
  {
    var modules = string.Join(", ", moduleNames);
    return $@"// Generated by dafny2js
// Do not edit manually - regenerate from Dafny sources

import BigNumber from 'bignumber.js';

// Configure BigNumber as Dafny expects
BigNumber.config({{ MODULO_MODE: BigNumber.EUCLID }});

// Import the generated code as raw text
import dafnyCode from './{cjsFileName}?raw';

// Set up the environment and evaluate the Dafny code
const require = (mod) => {{
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${{mod}}`);
}};

// Create a function that evaluates the code with proper scope
const initDafny = new Function('require', `
  ${{dafnyCode}}
  return {{ _dafny, {modules} }};
`);

const {{ _dafny, {modules} }} = initDafny(require);
";
  }
}
