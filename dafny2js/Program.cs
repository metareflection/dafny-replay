using System.CommandLine;
using Microsoft.Dafny;
using static Microsoft.Dafny.DafnyMain;

namespace Dafny2Js;

class Program
{
  static async Task<int> Main(string[] args)
  {
    var fileOpt = new Option<FileInfo>(
      new[] { "--file", "-f" },
      "Path to the .dfy file"
    ) { IsRequired = true };

    var appCoreOpt = new Option<string?>(
      new[] { "--app-core", "-a" },
      "Name of the AppCore module (optional, will be detected)"
    );

    var outputOpt = new Option<FileInfo?>(
      new[] { "--output", "-o" },
      "Output path for generated app.js"
    );

    var cjsNameOpt = new Option<string?>(
      new[] { "--cjs-name", "-c" },
      "Name of the .cjs file to import (default: derived from .dfy filename)"
    );

    var listOpt = new Option<bool>(
      new[] { "--list", "-l" },
      "Just list datatypes found (for debugging)"
    );

    var root = new RootCommand("Generate app.js adapter from Dafny sources")
    {
      fileOpt, appCoreOpt, outputOpt, cjsNameOpt, listOpt
    };

    root.SetHandler(async (FileInfo file, string? appCore, FileInfo? output, string? cjsName, bool list) =>
    {
      if (!file.Exists)
      {
        await Console.Error.WriteLineAsync($"File not found: {file.FullName}");
        Environment.ExitCode = 1;
        return;
      }

      var program = await ParseDafnyFileAsync(file.FullName);
      if (program == null)
      {
        await Console.Error.WriteLineAsync("Failed to parse Dafny file");
        Environment.ExitCode = 1;
        return;
      }

      if (list)
      {
        ListDatatypes(program, appCore);
        return;
      }

      // Generate app.js
      var generated = GenerateAppJs(program, appCore, file.Name, cjsName);

      if (output != null)
      {
        await File.WriteAllTextAsync(output.FullName, generated);
        Console.WriteLine($"Generated: {output.FullName}");
      }
      else
      {
        Console.WriteLine(generated);
      }

    }, fileOpt, appCoreOpt, outputOpt, cjsNameOpt, listOpt);

    return await root.InvokeAsync(args);
  }

  static async Task<Microsoft.Dafny.Program?> ParseDafnyFileAsync(string filePath)
  {
    var options = DafnyOptions.Default;
    var reporter = new ConsoleErrorReporter(options);

    var dafnyFile = DafnyFile.HandleDafnyFile(
      OnDiskFileSystem.Instance,
      reporter,
      options,
      new Uri(Path.GetFullPath(filePath)),
      Token.NoToken
    );

    if (dafnyFile == null)
    {
      await Console.Error.WriteLineAsync($"Failed to load Dafny file: {filePath}");
      return null;
    }

    var files = new List<DafnyFile> { dafnyFile };
    var (program, error) = await ParseCheck(
      TextReader.Null,
      files,
      "dafny2js",
      options
    );

    if (error != null)
    {
      await Console.Error.WriteLineAsync($"Parse error: {error}");
    }

    return program;
  }

  static string GenerateAppJs(Microsoft.Dafny.Program program, string? appCoreHint, string dafnyFileName, string? cjsNameHint)
  {
    var datatypes = TypeExtractor.ExtractDatatypes(program);

    // Try to detect the domain module (the one with Action datatype)
    var domainModule = datatypes
      .FirstOrDefault(dt => dt.Name == "Action")?.ModuleName
      ?? datatypes.FirstOrDefault()?.ModuleName
      ?? "Domain";

    // Use the AppCore module (required via --app-core or default to "AppCore")
    var appCoreModule = appCoreHint ?? "AppCore";
    var functions = TypeExtractor.ExtractFunctions(program, appCoreModule);

    // Use provided .cjs filename or derive from .dfy filename
    var cjsFileName = cjsNameHint ?? (Path.GetFileNameWithoutExtension(dafnyFileName) + ".cjs");

    var emitter = new AppJsEmitter(
      datatypes,
      functions,
      domainModule,
      appCoreModule,
      cjsFileName
    );

    return emitter.Generate();
  }

  static void ListDatatypes(Microsoft.Dafny.Program program, string? appCoreHint)
  {
    var datatypes = TypeExtractor.ExtractDatatypes(program);

    Console.WriteLine("=== Extracted Datatypes ===\n");

    foreach (var dt in datatypes)
    {
      Console.WriteLine($"datatype {dt.FullName}");
      foreach (var ctor in dt.Constructors)
      {
        if (ctor.Fields.Count == 0)
        {
          Console.WriteLine($"  | {ctor.Name}");
        }
        else
        {
          var fields = string.Join(", ", ctor.Fields.Select(f => $"{f.Name}: {f.Type}"));
          Console.WriteLine($"  | {ctor.Name}({fields})");
        }
      }
      Console.WriteLine();
    }

    // List functions from the specified AppCore module
    var appCoreModule = appCoreHint ?? "AppCore";
    var funcs = TypeExtractor.ExtractFunctions(program, appCoreModule);
    if (funcs.Count > 0)
    {
      Console.WriteLine($"=== {appCoreModule} Functions ===\n");
      foreach (var func in funcs)
      {
        var parms = string.Join(", ", func.Parameters.Select(p => $"{p.Name}: {p.Type}"));
        Console.WriteLine($"  {func.Name}({parms}): {func.ReturnType}");
      }
      Console.WriteLine();
    }
  }
}
