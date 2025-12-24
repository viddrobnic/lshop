CREATE TABLE users (
    id            INTEGER PRIMARY KEY NOT NULL,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
) STRICT;

CREATE TABLE user_sessions (
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
    session_hash TEXT NOT NULL PRIMARY KEY,
    expires_at   TEXT NOT NULL,
    created_at   TEXT NOT NULL
) STRICT;


CREATE TABLE stores (
    id         INTEGER PRIMARY KEY NOT NULL,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE sections (
    id         INTEGER PRIMARY KEY NOT NULL,
    store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    name       TEXT NOT NULL,
    ord        INTEGER NOT NULL,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX sections_store_id_order_idx ON sections(store_id, ord);

CREATE TABLE items (
    id         INTEGER PRIMARY KEY NOT NULL,
    store_id   INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,

    name       TEXT NOT NULL,
    checked    BOOLEAN NOT NULL DEFAULT FALSE,

    ord        INTEGER NOT NULL,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX items_all_idx ON items(checked, ord);
CREATE INDEX items_for_store_idx ON items(store_id, checked, ord);
CREATE INDEX items_for_section_idx ON items(section_id, checked, ord);
