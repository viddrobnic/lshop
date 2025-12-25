use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::Deserialize;

use crate::{
    auth::User,
    db::Db,
    handler::Problem,
    store::{self, section::Section},
};

#[derive(Deserialize)]
pub struct SectionNameReq {
    name: String,
}

pub async fn create(
    State(db): State<Db>,
    Path(store_id): Path<i64>,
    _: User,
    Json(req): Json<SectionNameReq>,
) -> Result<Json<Section>, Problem> {
    check_store_exists(&db, store_id).await?;

    let res = store::section::create(&db, store_id, &req.name).await;
    match res {
        Ok(section) => Ok(Json(section)),
        Err(err) => {
            tracing::error!(error = err.to_string(), "database error: {err}");
            Err(Problem::internal())
        }
    }
}

pub async fn list(
    State(db): State<Db>,
    Path(store_id): Path<i64>,
    _: User,
) -> Result<Json<Vec<Section>>, Problem> {
    check_store_exists(&db, store_id).await?;

    let res = store::section::list(&db, store_id).await;
    match res {
        Ok(sections) => Ok(Json(sections)),
        Err(err) => {
            tracing::error!(error = err.to_string(), "database error: {err}");
            Err(Problem::internal())
        }
    }
}

pub async fn update(
    State(db): State<Db>,
    Path(id): Path<i64>,
    _: User,
    Json(req): Json<SectionNameReq>,
) -> Result<Json<Section>, Problem> {
    let res = store::section::update(&db, id, &req.name).await;

    match res {
        Ok(section) => Ok(Json(section)),
        Err(sqlx::Error::RowNotFound) => Err(Problem::not_found()),
        Err(err) => {
            tracing::error!(error = err.to_string(), "database error: {err}");
            Err(Problem::internal())
        }
    }
}

pub async fn delete(
    State(db): State<Db>,
    Path(id): Path<i64>,
    _: User,
) -> Result<StatusCode, Problem> {
    let res = store::section::delete(&db, id).await;

    match res {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(err) => {
            tracing::error!(error = err.to_string(), "database error: {err}");
            Err(Problem::internal())
        }
    }
}

async fn check_store_exists(db: &Db, store_id: i64) -> Result<(), Problem> {
    let res = store::shop::get(db, store_id).await;
    match res {
        Ok(Some(_)) => Ok(()),
        Ok(None) => Err(Problem::not_found()),
        Err(err) => {
            tracing::error!(error = err.to_string(), "database error: {err}");
            Err(Problem::internal())
        }
    }
}
