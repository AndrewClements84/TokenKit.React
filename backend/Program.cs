using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using TokenKit.Core.Extensions;
using TokenKit.Core.Interfaces;
using TokenKit.Core.Models;
using TokenKit.Core.Implementations;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddTokenKitCore(
    jsonPath: Path.Combine(builder.Environment.ContentRootPath, "Registry", "models.data.json")
);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "TokenKit.React API", Version = "v1" });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("dev", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 50 * 1024 * 1024; // 50 MB
});

var app = builder.Build();

app.UseCors("dev");
app.UseSwagger();
app.UseSwaggerUI();

if (Directory.Exists(Path.Combine(app.Environment.ContentRootPath, "wwwroot")))
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

// ------------------------------------------------------------
// Health check
// ------------------------------------------------------------
app.MapGet("/api/health", () => Results.Ok(new
{
    ok = true,
    name = "TokenKit.React",
    time = DateTimeOffset.UtcNow
}));

// ------------------------------------------------------------
// List models (optionally filtered by provider or name)
// ------------------------------------------------------------
app.MapGet("/api/models", async (
    [FromServices] ITokenKitCore core,
    [FromQuery] string? provider,
    [FromQuery] string? contains) =>
{
    var models = await core.GetModelsAsync(provider);

    if (!string.IsNullOrWhiteSpace(contains))
        models = models
            .Where(m => (m.Id + " " + m.Provider)
            .Contains(contains, StringComparison.OrdinalIgnoreCase))
            .ToList();

    return Results.Ok(models);
});

// ------------------------------------------------------------
// Analyze text or file
// ------------------------------------------------------------
app.MapPost("/api/analyze", async (
    [FromServices] ITokenKitCore core,
    [FromBody] AnalyzeRequest req) =>
{
    string inputText = req.Input;

    if (req.FromFile && File.Exists(inputText))
        inputText = await File.ReadAllTextAsync(inputText);

    var result = await core.AnalyzeAsync(new TokenKit.Core.Models.AnalyzeRequest
    {
        Text = inputText,
        ModelId = req.Model,
        Engine = req.Engine
    });

    return Results.Ok(result);
});

// ------------------------------------------------------------
// Validate input text for token limit
// ------------------------------------------------------------
app.MapPost("/api/validate", async (
    [FromServices] ITokenKitCore core,
    [FromBody] ValidateRequest req) =>
{
    var result = await core.ValidateAsync(new TokenKit.Core.Models.ValidateRequest
    {
        Text = req.Input,
        ModelId = req.Model,
        Engine = req.Engine
    });

    return Results.Ok(result);
});

// ------------------------------------------------------------
// Upload a models.json file to replace or merge registry
// ------------------------------------------------------------
app.MapPost("/api/models/upload", async (
    [FromServices] IModelRegistry baseRegistry,
    HttpRequest request,
    [FromQuery] bool replace) =>
{
    if (!request.HasFormContentType)
        return Results.BadRequest(new { error = "multipart/form-data required" });

    var form = await request.ReadFormAsync();
    var file = form.Files.FirstOrDefault();
    if (file is null || file.Length == 0)
        return Results.BadRequest(new { error = "No file provided" });

    using var stream = file.OpenReadStream();
    using var reader = new StreamReader(stream);
    var json = await reader.ReadToEndAsync();

    try
    {
        var incoming = JsonSerializer.Deserialize<List<ModelInfo>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new JsonStringEnumConverter() }
        }) ?? new();

        if (baseRegistry is JsonModelRegistry registry)
        {
            var registryPath = Path.Combine(builder.Environment.ContentRootPath, "Registry", "models.data.json");
            var current = registry.GetAll().ToList();

            if (replace)
            {
                current = incoming;
            }
            else
            {
                foreach (var model in incoming)
                {
                    var index = current.FindIndex(m =>
                        string.Equals(m.Id, model.Id, StringComparison.OrdinalIgnoreCase));

                    if (index >= 0)
                        current[index] = model; // replace immutable record
                    else
                        current.Add(model);
                }
            }

            var jsonOut = JsonSerializer.Serialize(current, new JsonSerializerOptions { WriteIndented = true });
            Directory.CreateDirectory(Path.GetDirectoryName(registryPath)!);
            await File.WriteAllTextAsync(registryPath, jsonOut);
        }

        return Results.Ok(new { count = incoming.Count, replace });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

// ------------------------------------------------------------
// Merge models directly from JSON body
// ------------------------------------------------------------
app.MapPost("/api/models/merge", async (
    [FromServices] IModelRegistry baseRegistry,
    [FromBody] List<ModelInfo> incoming) =>
{
    if (baseRegistry is JsonModelRegistry registry)
    {
        var registryPath = Path.Combine(builder.Environment.ContentRootPath, "Registry", "models.data.json");
        var current = registry.GetAll().ToList();

        foreach (var model in incoming)
        {
            var index = current.FindIndex(m =>
                string.Equals(m.Id, model.Id, StringComparison.OrdinalIgnoreCase));

            if (index >= 0)
                current[index] = model; // replace immutable record
            else
                current.Add(model);
        }

        var jsonOut = JsonSerializer.Serialize(current, new JsonSerializerOptions { WriteIndented = true });
        Directory.CreateDirectory(Path.GetDirectoryName(registryPath)!);
        await File.WriteAllTextAsync(registryPath, jsonOut);
    }

    return Results.Ok(new { count = incoming.Count, replace = false });
});

// ------------------------------------------------------------
// Engines endpoint
// ------------------------------------------------------------
app.MapGet("/api/engines", () =>
{
    var engines = TokenKit.Core.Encoders.TokenKitCoreEncoders
        .Registered
        .Select(e => new { e.Name })
        .ToList();

    return Results.Ok(engines);
});

app.Run();

// ------------------------------------------------------------
// Request records (declared at end for clarity)
// ------------------------------------------------------------
record AnalyzeRequest(string Input, string Model, string Engine = "simple", bool FromFile = false);
record ValidateRequest(string Input, string Model, string Engine = "simple");
