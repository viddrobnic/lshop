use axum::{Json, extract::State, http::StatusCode};
use serde::Deserialize;

use crate::{auth::User, db::Db, handler::Problem, store};

#[derive(Deserialize)]
pub struct ItemCreateReq {
    pub store_id: Option<i64>,
    pub section_id: Option<i64>,
    pub name: String,
}

pub async fn create(
    State(db): State<Db>,
    _: User,
    Json(mut req): Json<ItemCreateReq>,
) -> Result<(StatusCode, Json<store::item::Item>), Problem> {
    // Check given store exists
    if let Some(store_id) = req.store_id {
        let store = store::shop::get(&db, store_id).await.map_err(|err| {
            tracing::error!(error = err.to_string(), "database error: {err}");
            Problem::internal()
        })?;

        if store.is_none() {
            return Err(Problem::new(
                StatusCode::NOT_FOUND,
                "Store not found".to_string(),
            ));
        }
    }

    // Check section is valid
    if let Some(section_id) = req.section_id {
        // Check section exists
        let section = store::section::get(&db, section_id).await.map_err(|err| {
            tracing::error!(error = err.to_string(), "database error: {err}");
            Problem::internal()
        })?;

        let Some(section) = section else {
            return Err(Problem::new(
                StatusCode::NOT_FOUND,
                "Section not found".to_string(),
            ));
        };

        // If store id is also given, check that it matches the section
        if let Some(store_id) = req.store_id
            && store_id != section.store_id
        {
            return Err(Problem::new(
                StatusCode::CONFLICT,
                "Section doesn't belong to the given store".to_string(),
            ));
        }

        // Set store_id to section's store id. This handles case when only section_id is given.
        req.store_id = Some(section.store_id);
    }

    // Insert to db
    let item = store::item::create(&db, req.store_id, req.section_id, &req.name)
        .await
        .map_err(|err| {
            tracing::error!(error = err.to_string(), "database error: {err}");
            Problem::internal()
        })?;

    Ok((StatusCode::CREATED, Json(item)))
}
