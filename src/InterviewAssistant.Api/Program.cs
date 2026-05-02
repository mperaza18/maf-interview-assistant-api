using InterviewAssistant.Api.Agents;
using InterviewAssistant.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ─── Services ─────────────────────────────────────────────────────────────────
builder.Services.AddControllers();

// Agents are thread-safe and expensive to construct — singletons are appropriate for a demo/dev setup.
builder.Services.AddSingleton<IAgentRunner, JsonAgentRunner>();
builder.Services.AddSingleton<IInterviewService, InterviewService>();

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "Interview Assistant API",
        Version = "v1",
        Description = "RESTful API wrapper around the Microsoft Agent Framework Interview Assistant demo."
    });
});

// ProblemDetails for consistent error responses (RFC 7807)
builder.Services.AddProblemDetails();

// CORS — open for development; tighten per environment in appsettings.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

// ─── App pipeline ─────────────────────────────────────────────────────────────
var app = builder.Build();

app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";

        var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "An unexpected error occurred.",
            Detail = app.Environment.IsDevelopment()
                ? context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error.ToString()
                : null
        };

        await context.Response.WriteAsJsonAsync(problem);
    });
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Interview Assistant API v1");
        c.RoutePrefix = string.Empty; // Serve Swagger UI at root
    });
}

app.UseCors();
app.MapControllers();

app.Run();

// Required for WebApplicationFactory<Program> in integration tests
public partial class Program { }
