use serde::Serialize;
use sqlx::prelude::{FromRow, Row};

use crate::db::Db;

#[derive(FromRow, Serialize)]
pub struct Section {
    pub id: i64,
    pub store_id: i64,
    pub name: String,
    pub ord: i64,

    #[serde(with = "time::serde::rfc3339")]
    pub created_at: time::OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: time::OffsetDateTime,
}

pub async fn create(db: &Db, store_id: i64, name: &str) -> Result<Section, sqlx::Error> {
    let now = time::OffsetDateTime::now_utc();

    let mut tx = db.begin().await?;

    let curr_ord: i64 = sqlx::query("SELECT MAX(ord) FROM sections WHERE store_id = ?")
        .bind(store_id)
        .fetch_one(&mut *tx)
        .await?
        .get(0);
    let ord = curr_ord + 1;

    let res = sqlx::query(
        "INSERT INTO sections (store_id, name, ord, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(store_id)
    .bind(name)
    .bind(ord)
    .bind(now)
    .bind(now)
    .execute(&mut *tx)
    .await?;
    let id = res.last_insert_rowid();

    tx.commit().await?;

    Ok(Section {
        id,
        store_id,
        name: name.to_string(),
        ord,
        created_at: now,
        updated_at: now,
    })
}

pub async fn list(db: &Db, store_id: i64) -> Result<Vec<Section>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM sections WHERE store_id = ? ORDER BY ord ASC")
        .bind(store_id)
        .fetch_all(db)
        .await
}

pub async fn update(db: &Db, id: i64, name: &str) -> Result<Section, sqlx::Error> {
    let now = time::OffsetDateTime::now_utc();

    sqlx::query_as(
        "UPDATE sections 
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
    sqlx::query("DELETE FROM sections WHERE id = ?")
        .bind(id)
        .execute(db)
        .await?;
    Ok(())
}
