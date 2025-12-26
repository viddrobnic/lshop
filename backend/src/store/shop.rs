use serde::Serialize;
use sqlx::{QueryBuilder, Sqlite, prelude::FromRow};

use crate::db::Db;

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Store {
    pub id: i64,
    pub name: String,

    #[serde(with = "time::serde::rfc3339")]
    pub created_at: time::OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: time::OffsetDateTime,
}

pub async fn create(db: &Db, name: &str) -> Result<Store, sqlx::Error> {
    let now = time::OffsetDateTime::now_utc();

    let res = sqlx::query("INSERT INTO stores (name, created_at, updated_at) VALUES (?, ?, ?)")
        .bind(name)
        .bind(now)
        .bind(now)
        .execute(db)
        .await?;
    let id = res.last_insert_rowid();

    Ok(Store {
        id,
        name: name.to_string(),
        created_at: now,
        updated_at: now,
    })
}

pub async fn list(db: &Db) -> Result<Vec<Store>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM stores ORDER BY name ASC, updated_at DESC")
        .fetch_all(db)
        .await
}

pub async fn update(db: &Db, id: i64, name: &str) -> Result<Store, sqlx::Error> {
    let now = time::OffsetDateTime::now_utc();

    sqlx::query_as(
        "UPDATE stores 
         SET name = ?, updated_at = ?
         WHERE id = ? 
         RETURNING *",
    )
    .bind(name)
    .bind(now)
    .bind(id)
    .fetch_one(db)
    .await
}

pub async fn delete(db: &Db, id: i64) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM stores WHERE id = ?")
        .bind(id)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn get(db: &Db, id: i64) -> Result<Option<Store>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM stores WHERE id = ?")
        .bind(id)
        .fetch_optional(db)
        .await
}

pub async fn list_for_ids(
    db: &Db,
    ids: impl Iterator<Item = i64>,
) -> Result<Vec<Store>, sqlx::Error> {
    let mut ids = ids.peekable();
    if ids.peek().is_none() {
        return Ok(vec![]);
    }

    let mut qb = QueryBuilder::<Sqlite>::new("SELECT * FROM stores WHERE id IN ");
    qb.push_tuples(ids, |mut b, id| {
        b.push_bind(id);
    });

    qb.build_query_as().fetch_all(db).await
}
