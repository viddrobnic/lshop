use password_hash::PasswordHash;
use sqlx::prelude::FromRow;

use crate::db::Db;

#[derive(FromRow)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub password_hash: String,
    pub created_at: time::OffsetDateTime,
    pub updated_at: time::OffsetDateTime,
}

pub async fn create_user(
    db: &Db,
    username: &str,
    password_hash: &PasswordHash<'_>,
) -> Result<(), sqlx::Error> {
    let now = time::OffsetDateTime::now_utc();
    let pass_hash_str = password_hash.to_string();

    sqlx::query(
        "INSERT INTO users
            (username, password_hash, created_at, updated_at) 
        VALUES (?, ?, ?, ?)",
    )
    .bind(username)
    .bind(pass_hash_str)
    .bind(now)
    .bind(now)
    .execute(db)
    .await?;

    Ok(())
}

pub async fn get_user(db: &Db, username: &str) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM users WHERE username = ?")
        .bind(username)
        .fetch_optional(db)
        .await
}

pub async fn create_session(
    db: &Db,
    user_id: i64,
    session_hash: &str,
    expires_at: time::OffsetDateTime,
) -> Result<(), sqlx::Error> {
    let now = time::OffsetDateTime::now_utc();

    sqlx::query(
        "INSERT INTO user_sessions 
            (user_id, session_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?)",
    )
    .bind(user_id)
    .bind(session_hash)
    .bind(expires_at)
    .bind(now)
    .execute(db)
    .await?;

    Ok(())
}

pub async fn get_session(db: &Db, session_hash: &str) -> Result<Option<User>, sqlx::Error> {
    let now = time::OffsetDateTime::now_utc();

    sqlx::query_as(
        "SELECT u.* FROM users u 
         INNER JOIN user_sessions sess ON u.id = sess.user_id
         WHERE sess.session_hash = ? 
            AND sess.expires_at > ?",
    )
    .bind(session_hash)
    .bind(now)
    .fetch_optional(db)
    .await
}

pub async fn delete_session(db: &Db, session_hash: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM user_sessions WHERE session_hash = ?")
        .bind(session_hash)
        .execute(db)
        .await?;
    Ok(())
}
