use std::sync::Arc;

use axum::extract::FromRef;

use crate::config::Config;

type OpenAiClient = async_openai::Client<async_openai::config::OpenAIConfig>;

#[derive(Clone, FromRef)]
pub struct AppState {
    pub db: sqlx::SqlitePool,
    pub config: Arc<Config>,
    pub openai: OpenAiClient,
}

impl AppState {
    pub fn new(db: sqlx::SqlitePool, conf: Config, openai: OpenAiClient) -> Self {
        Self {
            db,
            config: Arc::new(conf),
            openai,
        }
    }
}
