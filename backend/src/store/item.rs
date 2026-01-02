use std::collections::HashMap;

use serde::Serialize;
use sqlx::prelude::{FromRow, Row};
use sqlx::{Executor, QueryBuilder, Sqlite};

use crate::db::Db;

#[derive(Debug, FromRow, Serialize)]
pub struct Item {
    pub id: i64,
    pub store_id: Option<i64>,
    pub section_id: Option<i64>,

    pub name: String,
    pub checked: bool,

    #[serde(skip)]
    pub ord: i64,

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

pub async fn list(db: &Db) -> Result<Vec<Item>, sqlx::Error> {
    sqlx::query_as("SELECT * FROM items WHERE checked = FALSE")
        .fetch_all(db)
        .await
}

pub async fn unassigned_for_store<'c, E: Executor<'c, Database = Sqlite>>(
    db: E,
    store_id: i64,
) -> Result<Vec<Item>, sqlx::Error> {
    sqlx::query_as(
        "SELECT * FROM items 
         WHERE store_id = ? 
           AND section_id IS NULL 
           AND checked = FALSE
         ORDER BY ord ASC",
    )
    .bind(store_id)
    .fetch_all(db)
    .await
}

pub async fn organize(
    db: &Db,
    store_id: i64,
    update: &HashMap<i64, Vec<i64>>,
) -> Result<(), sqlx::Error> {
    let mut tx = db.begin().await?;

    for (section_id, items) in update.iter() {
        organize_section(&mut tx, store_id, *section_id, items).await?
    }

    tx.commit().await
}

pub async fn update(
    db: &Db,
    id: i64,
    name: &str,
    checked: bool,
) -> Result<Option<Item>, sqlx::Error> {
    let now = time::OffsetDateTime::now_utc();

    sqlx::query_as(
        "UPDATE items SET name = ?, checked = ?, updated_at = ? WHERE id = ? RETURNING *",
    )
    .bind(name)
    .bind(checked)
    .bind(now)
    .bind(id)
    .fetch_optional(db)
    .await
}

async fn organize_section(
    tx: &mut sqlx::SqliteTransaction<'_>,
    store_id: i64,
    section_id: i64,
    items: &[i64],
) -> Result<(), sqlx::Error> {
    if items.is_empty() {
        return Ok(());
    }

    let now = time::OffsetDateTime::now_utc();
    let ord_start = max_ord(&mut **tx, Some(store_id), Some(section_id)).await?;

    let mut qb = QueryBuilder::<Sqlite>::new("WITH updates(id, ord) AS (");

    qb.push_values(items.iter().enumerate(), |mut b, (idx, id)| {
        let ord = ord_start + (idx as i64) + 1;
        b.push_bind(*id).push_bind(ord);
    });

    qb.push(") ")
        .push(
            "UPDATE items
             SET ord = updates.ord, section_id = ",
        )
        .push_bind(section_id)
        .push(", updated_at = ")
        .push_bind(now)
        .push("FROM updates WHERE items.id = updates.id");

    qb.build().execute(&mut **tx).await?;
    Ok(())
}

async fn max_ord<'c, E: Executor<'c, Database = Sqlite>>(
    e: E,
    store_id: Option<i64>,
    section_id: Option<i64>,
) -> Result<i64, sqlx::Error> {
    let curr_ord: i64 = sqlx::query(
        "SELECT MAX(ord) FROM items 
         WHERE store_id IS ? 
           AND section_id IS ? 
           AND checked = FALSE",
    )
    .bind(store_id)
    .bind(section_id)
    .fetch_one(e)
    .await?
    .get(0);
    Ok(curr_ord)
}
