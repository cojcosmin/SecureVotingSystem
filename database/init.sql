CREATE TABLE voter_records (
    voter_hash VARCHAR(256) PRIMARY KEY,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vote_chain (
    block_id SERIAL PRIMARY KEY,
    candidate_name VARCHAR(150) NOT NULL,
    previous_hash VARCHAR(256) NOT NULL,
    block_hash VARCHAR(256) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO vote_chain (block_id, candidate_name, previous_hash, block_hash) 
VALUES (0, 'Genesis', '0', '00000000000000000000000000000000');