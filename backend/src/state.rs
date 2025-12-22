use std::sync::Arc;

use axum::extract::FromRef;

use crate::config::Config;

#[derive(Clone, FromRef)]
pub struct AppState {
    pub db: sqlx::SqlitePool,
    pub config: Arc<Config>,
}

impl AppState {
    pub fn new(db: sqlx::SqlitePool, conf: Config) -> Self {
        Self {
            db,
            config: Arc::new(conf),
        }
    }
}
