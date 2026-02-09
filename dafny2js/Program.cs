using System.CommandLine;
using Microsoft.Dafny;
using static Microsoft.Dafny.DafnyMain;
using Dafny2Js.Emitters;

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

    // Legacy: --output for backwards compatibility (same as --client)
    var outputOpt = new Option<FileInfo?>(
      new[] { "--output", "-o" },
      "Output path for generated app.js (legacy, use --client instead)"
    );

    var cjsNameOpt = new Option<string?>(
      new[] { "--cjs-name", "-c" },
      "Name of the .cjs file to import (default: derived from .dfy filename)"
    );

    var listOpt = new Option<bool>(
      new[] { "--list", "-l" },
      "Just list datatypes found (for debugging)"
    );

    // New options
    var clientOpt = new Option<FileInfo?>(
      new[] { "--client" },
      "Output path for client adapter (app.js or app.ts based on extension)"
    );

    var denoOpt = new Option<FileInfo?>(
      new[] { "--deno" },
      "Output path for Deno adapter (dafny-bundle.ts)"
    );

    var cloudflareOpt = new Option<FileInfo?>(
      new[] { "--cloudflare" },
      "Output path for Cloudflare Workers adapter (dafny-bundle.ts)"
    );

    var nullOptionsOpt = new Option<bool>(
      new[] { "--null-options" },
      "Enable null-based Option handling for DB compatibility"
    );

    var dispatchOpt = new Option<string[]>(
      new[] { "--dispatch" },
      "Dispatch function to generate (format: name:Module.Dispatch or just Module.Dispatch for default name)"
    ) { AllowMultipleArgumentsPerToken = true };

    var cjsPathOpt = new Option<FileInfo?>(
      new[] { "--cjs-path" },
      "Path to the .cjs file (required for --deno if different from default location)"
    );

    var root = new RootCommand("Generate app.js and dafny-bundle.ts adapters from Dafny sources")
    {
      fileOpt, appCoreOpt, outputOpt, cjsNameOpt, listOpt,
      clientOpt, denoOpt, cloudflareOpt, nullOptionsOpt, dispatchOpt, cjsPathOpt
    };

    root.SetHandler(async (context) =>
    {
      var file = context.ParseResult.GetValueForOption(fileOpt)!;
      var appCore = context.ParseResult.GetValueForOption(appCoreOpt);
      var output = context.ParseResult.GetValueForOption(outputOpt);
      var cjsName = context.ParseResult.GetValueForOption(cjsNameOpt);
      var list = context.ParseResult.GetValueForOption(listOpt);
      var client = context.ParseResult.GetValueForOption(clientOpt);
      var deno = context.ParseResult.GetValueForOption(denoOpt);
      var cloudflare = context.ParseResult.GetValueForOption(cloudflareOpt);
      var nullOptions = context.ParseResult.GetValueForOption(nullOptionsOpt);
      var dispatchArgs = context.ParseResult.GetValueForOption(dispatchOpt) ?? Array.Empty<string>();
      var cjsPath = context.ParseResult.GetValueForOption(cjsPathOpt);

      if (!file.Exists)
      {
        await Console.Error.WriteLineAsync($"File not found: {file.FullName}");
        context.ExitCode = 1;
        return;
      }

      var program = await ParseDafnyFileAsync(file.FullName);
      if (program == null)
      {
        await Console.Error.WriteLineAsync("Failed to parse Dafny file");
        context.ExitCode = 1;
        return;
      }

      if (list)
      {
        ListDatatypes(program, appCore);
        return;
      }

      // Use --client if provided, otherwise fall back to legacy --output
      var clientOutput = client ?? output;

      // Determine cjs filename
      var cjsFileName = cjsName ?? (Path.GetFileNameWithoutExtension(file.Name) + ".cjs");

      // Extract types and functions
      var datatypes = TypeExtractor.ExtractDatatypes(program);

      // Try to detect the domain module (the one with Action datatype)
      var domainModule = datatypes
        .FirstOrDefault(dt => dt.Name == "Action")?.ModuleName
        ?? datatypes.FirstOrDefault()?.ModuleName
        ?? "Domain";

      var appCoreModule = appCore ?? "AppCore";
      var functions = TypeExtractor.ExtractFunctions(program, appCoreModule);

      // Generate client output
      if (clientOutput != null)
      {
        var useTypeScript = clientOutput.Extension.ToLowerInvariant() == ".ts";
        var emitter = new ClientEmitter(
          datatypes,
          functions,
          domainModule,
          appCoreModule,
          cjsFileName,
          nullOptions,
          useTypeScript
        );

        var generated = emitter.Generate();
        await File.WriteAllTextAsync(clientOutput.FullName, generated);
        Console.WriteLine($"Generated client: {clientOutput.FullName}");
      }

      // Generate Deno output
      if (deno != null)
      {
        // Determine .cjs path for Deno emitter
        var cjsFilePath = cjsPath?.FullName;
        if (cjsFilePath == null)
        {
          // Try to find the .cjs file relative to the output
          var denoDir = Path.GetDirectoryName(deno.FullName) ?? ".";
          cjsFilePath = Path.Combine(denoDir, "../../../src/dafny", cjsFileName);

          if (!File.Exists(cjsFilePath))
          {
            // Try current directory
            cjsFilePath = Path.Combine(".", cjsFileName);
          }

          if (!File.Exists(cjsFilePath))
          {
            await Console.Error.WriteLineAsync($"Error: Cannot find .cjs file. Use --cjs-path to specify the path.");
            await Console.Error.WriteLineAsync($"Tried: {cjsFilePath}");
            context.ExitCode = 1;
            return;
          }
        }

        // Parse dispatch configurations
        var dispatches = ParseDispatchConfigs(dispatchArgs, domainModule);
        if (dispatches.Count == 0)
        {
          // Default dispatch using collaboration module pattern
          var collaborationModule = domainModule.Replace("Domain", "MultiCollaboration");
          if (domainModule.EndsWith("Domain"))
          {
            collaborationModule = domainModule.Substring(0, domainModule.Length - 6) + "MultiCollaboration";
          }
          dispatches.Add(new DispatchConfig("dispatch", $"{collaborationModule}.Dispatch", collaborationModule));
        }

        var denoEmitter = new DenoEmitter(
          datatypes,
          functions,
          domainModule,
          appCoreModule,
          cjsFileName,
          cjsFilePath,
          dispatches,
          nullOptions
        );

        var generated = denoEmitter.Generate();
        await File.WriteAllTextAsync(deno.FullName, generated);
        Console.WriteLine($"Generated Deno bundle: {deno.FullName}");
      }

      // Generate Cloudflare output
      if (cloudflare != null)
      {
        // Determine .cjs path for Cloudflare emitter
        var cjsFilePath = cjsPath?.FullName;
        if (cjsFilePath == null)
        {
          // Try to find the .cjs file relative to the output
          var cloudflareDir = Path.GetDirectoryName(cloudflare.FullName) ?? ".";
          cjsFilePath = Path.Combine(cloudflareDir, "../../../src/dafny", cjsFileName);

          if (!File.Exists(cjsFilePath))
          {
            // Try current directory
            cjsFilePath = Path.Combine(".", cjsFileName);
          }

          if (!File.Exists(cjsFilePath))
          {
            await Console.Error.WriteLineAsync($"Error: Cannot find .cjs file. Use --cjs-path to specify the path.");
            await Console.Error.WriteLineAsync($"Tried: {cjsFilePath}");
            context.ExitCode = 1;
            return;
          }
        }

        // Parse dispatch configurations
        var dispatches = ParseDispatchConfigs(dispatchArgs, domainModule);
        if (dispatches.Count == 0)
        {
          // Default dispatch using collaboration module pattern
          var collaborationModule = domainModule.Replace("Domain", "MultiCollaboration");
          if (domainModule.EndsWith("Domain"))
          {
            collaborationModule = domainModule.Substring(0, domainModule.Length - 6) + "MultiCollaboration";
          }
          dispatches.Add(new DispatchConfig("dispatch", $"{collaborationModule}.Dispatch", collaborationModule));
        }

        var cloudflareEmitter = new CloudflareEmitter(
          datatypes,
          functions,
          domainModule,
          appCoreModule,
          cjsFileName,
          cjsFilePath,
          dispatches,
          nullOptions
        );

        var generated = cloudflareEmitter.Generate();
        await File.WriteAllTextAsync(cloudflare.FullName, generated);
        Console.WriteLine($"Generated Cloudflare bundle: {cloudflare.FullName}");
      }

      // If neither --client nor --deno nor --cloudflare specified, default to legacy behavior
      if (clientOutput == null && deno == null && cloudflare == null)
      {
        // Use legacy AppJsEmitter for backwards compatibility
        var emitter = new AppJsEmitter(
          datatypes,
          functions,
          domainModule,
          appCoreModule,
          cjsFileName
        );

        var generated = emitter.Generate();
        Console.WriteLine(generated);
      }
    });

    return await root.InvokeAsync(args);
  }

  static List<DispatchConfig> ParseDispatchConfigs(string[] args, string domainModule)
  {
    var result = new List<DispatchConfig>();

    foreach (var arg in args)
    {
      // Format: name:Module.Dispatch or just Module.Dispatch
      var parts = arg.Split(':', 2);
      string name, path;

      if (parts.Length == 2)
      {
        name = parts[0];
        path = parts[1];
      }
      else
      {
        name = "dispatch";
        path = arg;
      }

      // Extract module from path (e.g., "TodoMultiCollaboration.Dispatch" -> "TodoMultiCollaboration")
      var dotIndex = path.LastIndexOf('.');
      var module = dotIndex > 0 ? path.Substring(0, dotIndex) : path;

      result.Add(new DispatchConfig(name, path, module));
    }

    return result;
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
