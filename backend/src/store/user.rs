use password_hash::PasswordHash;
use sea_query::{Query, SqliteQueryBuilder};
use sea_query_sqlx::SqlxBinder;
use sqlx::SqlitePool;

use crate::store::table::Users;

pub async fn create_user(
    db: SqlitePool,
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

    sqlx::query_with(&query, args).execute(&db).await?;
    Ok(())
}
