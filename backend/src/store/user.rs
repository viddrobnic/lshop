use password_hash::PasswordHash;
use sea_query::{Expr, ExprTrait, Query, SqliteQueryBuilder};
use sea_query_sqlx::SqlxBinder;
use sqlx::prelude::FromRow;

use crate::db::Db;
use crate::store::table::Users;

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
