use password_hash::PasswordHash;
use sea_query::{Expr, ExprTrait, Query, SqliteQueryBuilder};
use sea_query_sqlx::SqlxBinder;
use sqlx::prelude::FromRow;

use crate::db::Db;
use crate::store::table::{UserSessions, Users};

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

    let (query, args) = Query::insert()
        .into_table(Users::Table)
        .columns([
            Users::Username,
            Users::PasswordHash,
            Users::CreatedAt,
            Users::UpdatedAt,
        ])
        .values_panic([
            username.into(),
            password_hash.to_string().into(),
            now.into(),
            now.into(),
        ])
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&query, args).execute(db).await?;
    Ok(())
}

pub async fn get_user(db: &Db, username: &str) -> Result<Option<User>, sqlx::Error> {
    let (query, args) = Query::select()
        .columns([
            Users::Id,
            Users::Username,
            Users::PasswordHash,
            Users::CreatedAt,
            Users::UpdatedAt,
        ])
        .from(Users::Table)
        .and_where(Expr::col(Users::Username).eq(username))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_as_with(&query, args).fetch_optional(db).await
}

pub async fn create_session(
    db: &Db,
    user_id: i64,
    session_hash: &str,
    expires_at: time::OffsetDateTime,
) -> Result<(), sqlx::Error> {
    let now = time::OffsetDateTime::now_utc();

    let (query, args) = Query::insert()
        .into_table(UserSessions::Table)
        .columns([
            UserSessions::UserId,
            UserSessions::SessionHash,
            UserSessions::ExpiresAt,
            UserSessions::CreatedAt,
        ])
        .values_panic([
            user_id.into(),
            session_hash.into(),
            expires_at.into(),
            now.into(),
        ])
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&query, args).execute(db).await?;
    Ok(())
}

pub async fn get_session(db: &Db, session_hash: &str) -> Result<Option<User>, sqlx::Error> {
    let now = time::OffsetDateTime::now_utc();

    let (query, args) = Query::select()
        .columns([
            (Users::Table, Users::Id),
            (Users::Table, Users::Username),
            (Users::Table, Users::PasswordHash),
            (Users::Table, Users::CreatedAt),
            (Users::Table, Users::UpdatedAt),
        ])
        .from(Users::Table)
        .inner_join(
            UserSessions::Table,
            Expr::col(Users::Id).equals(UserSessions::UserId),
        )
        .and_where(Expr::col(UserSessions::SessionHash).eq(session_hash))
        .and_where(Expr::col(UserSessions::ExpiresAt).gt(now))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_as_with(&query, args).fetch_optional(db).await
}

pub async fn delete_session(db: &Db, session_hash: &str) -> Result<(), sqlx::Error> {
    let (query, args) = Query::delete()
        .from_table(UserSessions::Table)
        .and_where(Expr::col(UserSessions::SessionHash).eq(session_hash))
        .build_sqlx(SqliteQueryBuilder);

    sqlx::query_with(&query, args).execute(db).await?;
    Ok(())
}
