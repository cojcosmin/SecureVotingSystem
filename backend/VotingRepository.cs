using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using Npgsql;

namespace SecureVotingAPI
{
    // Modele de date (DTOs) trimise ca JSON către interfață
    public record VoteRequest(string Cnp, string Candidate);
    public record UpdateAttackRequest(int BlockId, string FakeCandidate);
    public record DeleteAttackRequest(int BlockId);
    public record VoteBlockDto(int BlockId, string CandidateName, string PreviousHash, string BlockHash, DateTime CreatedAt);
    public record CandidateResultDto(string CandidateName, long VoteCount);
    public record AuditResultDto(bool IsValid, int TotalVotes, string Message, int? CompromisedBlockId);
    public record BenchmarkResultDto(int VoteCount, long InsertMs, double AvgMsPerVote, double VotesPerSec, long AuditMs, bool IsValid);

    public class VotingRepository
    {
        private readonly string _connectionString = "Host=localhost;Username=postgres;Password=parola_demo_scss;Database=SecureVotingDB";
        private const string GlobalSalt = "URA_SecretSalt_2026";

        public async Task ResetDatabaseAsync()
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            var cmd = new NpgsqlCommand(@"
                TRUNCATE TABLE voter_records, vote_chain RESTART IDENTITY;
                INSERT INTO vote_chain (block_id, candidate_name, previous_hash, block_hash) 
                VALUES (0, 'Genesis', '0', '00000000000000000000000000000000');",
                connection);
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<(bool Success, string Message)> CastVoteAsync(string cnpAlegator, string candidat)
        {
            if (string.IsNullOrWhiteSpace(cnpAlegator) || string.IsNullOrWhiteSpace(candidat))
                return (false, "CNP-ul și candidatul sunt obligatorii.");

            string voterHash = GenerateVoterHash(cnpAlegator);

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            using var transaction = await connection.BeginTransactionAsync();

            try
            {
                var insertVoterCmd = new NpgsqlCommand(
                    "INSERT INTO voter_records (voter_hash) VALUES (@hash)",
                    connection, transaction);
                insertVoterCmd.Parameters.AddWithValue("hash", voterHash);
                await insertVoterCmd.ExecuteNonQueryAsync();

                var getPreviousHashCmd = new NpgsqlCommand(
                    "SELECT block_hash FROM vote_chain ORDER BY block_id DESC LIMIT 1",
                    connection, transaction);
                string previousHash = (string)(await getPreviousHashCmd.ExecuteScalarAsync())!;

                string newBlockHash = CalculateBlockHash(candidat, previousHash);

                var insertVoteCmd = new NpgsqlCommand(
                    "INSERT INTO vote_chain (candidate_name, previous_hash, block_hash) VALUES (@candidate, @prev, @current)",
                    connection, transaction);
                insertVoteCmd.Parameters.AddWithValue("candidate", candidat);
                insertVoteCmd.Parameters.AddWithValue("prev", previousHash);
                insertVoteCmd.Parameters.AddWithValue("current", newBlockHash);
                await insertVoteCmd.ExecuteNonQueryAsync();

                await transaction.CommitAsync();
                return (true, $"Vot salvat anonim pentru {candidat}.");
            }
            catch (PostgresException ex) when (ex.SqlState == "23505")
            {
                await transaction.RollbackAsync();
                return (false, "Tentativă de vot multiplu blocată la nivel de bază de date!");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, $"Eroare tranzacție (Rollback): {ex.Message}");
            }
        }

        public async Task<List<VoteBlockDto>> GetChainAsync()
        {
            var blocks = new List<VoteBlockDto>();
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            var cmd = new NpgsqlCommand(
                "SELECT block_id, candidate_name, previous_hash, block_hash, created_at FROM vote_chain ORDER BY block_id ASC",
                connection);

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                blocks.Add(new VoteBlockDto(
                    reader.GetInt32(0),
                    reader.GetString(1),
                    reader.GetString(2),
                    reader.GetString(3),
                    reader.GetDateTime(4)
                ));
            }
            return blocks;
        }

        public async Task<List<CandidateResultDto>> GetResultsAsync()
        {
            var results = new List<CandidateResultDto>();
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            var cmd = new NpgsqlCommand(
                "SELECT candidate_name, COUNT(*) FROM vote_chain WHERE block_id > 0 GROUP BY candidate_name ORDER BY COUNT(*) DESC",
                connection);

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new CandidateResultDto(reader.GetString(0), reader.GetInt64(1)));
            }
            return results;
        }

        public async Task<AuditResultDto> ValidateChainIntegrityAsync()
        {
            var blocks = await GetChainAsync();
            int totalVotes = Math.Max(0, blocks.Count - 1);

            for (int i = 1; i < blocks.Count; i++)
            {
                var current = blocks[i];
                var previous = blocks[i - 1];

                string recalculatedHash = CalculateBlockHash(current.CandidateName, current.PreviousHash);
                if (current.BlockHash != recalculatedHash)
                {
                    return new AuditResultDto(
                        false,
                        totalVotes,
                        $"ALERTA SECURITY: Fraudă detectată la Block ID {current.BlockId}! Candidatul a fost modificat direct în DB.",
                        current.BlockId
                    );
                }

                if (current.PreviousHash != previous.BlockHash)
                {
                    return new AuditResultDto(
                        false,
                        totalVotes,
                        $"ALERTA SECURITY: Lanț rupt între Block ID {previous.BlockId} și Block ID {current.BlockId}!",
                        current.BlockId
                    );
                }
            }

            return new AuditResultDto(true, totalVotes, $"Integritate confirmată. Toate cele {totalVotes} voturi sunt nealterate.", null);
        }

        public async Task<string> SimulateUpdateAttackAsync(int blockId, string fakeCandidate)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            var cmd = new NpgsqlCommand(
                "UPDATE vote_chain SET candidate_name = @fake WHERE block_id = @id",
                connection);
            cmd.Parameters.AddWithValue("fake", fakeCandidate);
            cmd.Parameters.AddWithValue("id", blockId);
            int affected = await cmd.ExecuteNonQueryAsync();
            return affected > 0
                ? $"Atac SQL UPDATE executat: Block ID {blockId} a fost modificat în '{fakeCandidate}'."
                : $"Nu există niciun vot cu Block ID {blockId}.";
        }

        public async Task<string> SimulateDeleteAttackAsync(int blockId)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            var cmd = new NpgsqlCommand(
                "DELETE FROM vote_chain WHERE block_id = @id",
                connection);
            cmd.Parameters.AddWithValue("id", blockId);
            int affected = await cmd.ExecuteNonQueryAsync();
            return affected > 0
                ? $"Atac SQL DELETE executat: Block ID {blockId} a fost șters din lanț."
                : $"Nu există niciun vot cu Block ID {blockId}.";
        }

        public async Task<List<BenchmarkResultDto>> RunBenchmarkAsync()
        {
            int[] sizes = { 100, 1000, 5000 };
            string[] candidates = { "Candidat A", "Candidat B", "Candidat C" };
            var results = new List<BenchmarkResultDto>();

            foreach (int count in sizes)
            {
                await ResetDatabaseAsync();

                var insertWatch = Stopwatch.StartNew();
                for (int i = 1; i <= count; i++)
                {
                    await CastVoteAsync($"BENCHMARK_USER_{i}", candidates[i % candidates.Length]);
                }
                insertWatch.Stop();

                var validateWatch = Stopwatch.StartNew();
                var audit = await ValidateChainIntegrityAsync();
                validateWatch.Stop();

                results.Add(new BenchmarkResultDto(
                    count,
                    insertWatch.ElapsedMilliseconds,
                    Math.Round((double)insertWatch.ElapsedMilliseconds / count, 2),
                    Math.Round(count / insertWatch.Elapsed.TotalSeconds, 0),
                    validateWatch.ElapsedMilliseconds,
                    audit.IsValid
                ));
            }

            return results;
        }

        private string GenerateVoterHash(string cnp)
        {
            using SHA256 sha256 = SHA256.Create();
            byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(cnp + GlobalSalt));
            return Convert.ToBase64String(bytes);
        }

        private string CalculateBlockHash(string candidate, string previousHash)
        {
            using SHA256 sha256 = SHA256.Create();
            string rawData = $"{candidate}-{previousHash}";
            byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(rawData));
            return Convert.ToBase64String(bytes);
        }
    }
}