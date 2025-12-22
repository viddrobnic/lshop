CREATE TABLE users (
    id            INT PRIMARY KEY,
    username      TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
) STRICT;

CREATE TABLE user_sessions (
    user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
    session_hash TEXT NOT NULL,
    expires_at   TEXT NOT NULL,
    created_at   TEXT NOT NULL
) STRICT;

CREATE INDEX user_session_hash_idx ON user_sessions(session_hash);
