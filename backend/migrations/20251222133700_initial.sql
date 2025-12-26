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

CREATE INDEX stores_name_idx ON stores(name);

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

CREATE INDEX items_ord_idx ON items(checked, store_id, section_id, ord);
