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
    store::{self, shop::Store},
};

#[derive(Deserialize)]
pub struct StoreNameReq {
    name: String,
}

pub async fn create(
    State(db): State<Db>,
    _: User,
    Json(req): Json<StoreNameReq>,
) -> Result<Json<Store>, Problem> {
    let res = store::shop::create(&db, &req.name).await;
    match res {
        Ok(shop) => Ok(Json(shop)),
        Err(err) => {
            tracing::error!(error = err.to_string(), "database error: {err}");
            Err(Problem::internal())
        }
    }
}

pub async fn list(State(db): State<Db>, _: User) -> Result<Json<Vec<Store>>, Problem> {
    let res = store::shop::list(&db).await;
    match res {
        Ok(shops) => Ok(Json(shops)),
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
    Json(req): Json<StoreNameReq>,
) -> Result<Json<Store>, Problem> {
    let res = store::shop::update(&db, id, &req.name).await;

    match res {
        Ok(shop) => Ok(Json(shop)),
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
    let res = store::shop::delete(&db, id).await;

    match res {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(err) => {
            tracing::error!(error = err.to_string(), "database error: {err}");
            Err(Problem::internal())
        }
    }
}
