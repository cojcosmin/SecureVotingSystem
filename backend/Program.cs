using SecureVotingAPI;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

builder.Services.AddSingleton<VotingRepository>();

var app = builder.Build();

app.UseCors("AllowFrontend");

app.MapPost("/api/votes", async (VoteRequest req, VotingRepository repo) =>
{
    var (success, message) = await repo.CastVoteAsync(req.Cnp, req.Candidate);
    return success ? Results.Ok(new { success, message }) : Results.BadRequest(new { success, message });
});

app.MapGet("/api/votes/chain", async (VotingRepository repo) =>
    Results.Ok(await repo.GetChainAsync()));

app.MapGet("/api/votes/results", async (VotingRepository repo) =>
    Results.Ok(await repo.GetResultsAsync()));

app.MapGet("/api/audit", async (VotingRepository repo) =>
    Results.Ok(await repo.ValidateChainIntegrityAsync()));

app.MapPost("/api/attacks/update", async (UpdateAttackRequest req, VotingRepository repo) =>
{
    var message = await repo.SimulateUpdateAttackAsync(req.BlockId, req.FakeCandidate);
    return Results.Ok(new { message });
});

app.MapPost("/api/attacks/delete", async (DeleteAttackRequest req, VotingRepository repo) =>
{
    var message = await repo.SimulateDeleteAttackAsync(req.BlockId);
    return Results.Ok(new { message });
});

app.MapPost("/api/benchmark", async (VotingRepository repo) =>
    Results.Ok(await repo.RunBenchmarkAsync()));

app.MapPost("/api/reset", async (VotingRepository repo) =>
{
    await repo.ResetDatabaseAsync();
    return Results.Ok(new { message = "Baza de date a fost resetată." });
});

app.Run();