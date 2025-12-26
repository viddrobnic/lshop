use serde::Serialize;
use sqlx::prelude::{FromRow, Row};
use sqlx::{Executor, Sqlite};

use crate::db::Db;

#[derive(FromRow, Serialize)]
pub struct Item {
    pub id: i64,
    pub store_id: Option<i64>,
    pub section_id: Option<i64>,

    pub name: String,
    pub checked: bool,

    #[serde(with = "time::serde::rfc3339")]
    pub created_at: time::OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: time::OffsetDateTime,
}

pub async fn create(
    db: &Db,
    store_id: Option<i64>,
    section_id: Option<i64>,
    name: &str,
) -> Result<Item, sqlx::Error> {
    let now = time::OffsetDateTime::now_utc();

    let mut tx = db.begin().await?;
    let curr_ord = max_ord(&mut *tx, store_id, section_id).await?;
    let ord = curr_ord + 1;

    let item: Item = sqlx::query_as(
        "INSERT INTO items (store_id, section_id, name, ord, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?) 
         RETURNING *",
    )
    .bind(store_id)
    .bind(section_id)
    .bind(name)
    .bind(ord)
    .bind(now)
    .bind(now)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(item)
}

async fn max_ord<'c, E: Executor<'c, Database = Sqlite>>(
    e: E,
    store_id: Option<i64>,
    section_id: Option<i64>,
) -> Result<i64, sqlx::Error> {
    let curr_ord: i64 =
        sqlx::query("SELECT MAX(ord) FROM items WHERE store_id IS ? AND section_id IS ?")
            .bind(store_id)
            .bind(section_id)
            .fetch_one(e)
            .await?
            .get(0);
    Ok(curr_ord)
}
