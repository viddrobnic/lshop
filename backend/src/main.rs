use axum::{Router, response::Html, routing::get};
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;
use tracing::Level;
use tracing_subscriber::EnvFilter;

use crate::config::Config;
use state::AppState;

mod config;
mod db;
mod state;

fn init_tracing(conf: &Config) {
    if conf.environment.is_dev() {
        let filter = EnvFilter::new("debug,sqlx=info");
        tracing_subscriber::fmt().with_env_filter(filter).init();
    } else {
        tracing_subscriber::fmt()
            .json()
            .with_max_level(Level::INFO)
            .init();
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let conf = Config::new()?;
    init_tracing(&conf);

    let db_pool = db::connect(&conf.db_path).await?;

    let state = AppState::new(db_pool, conf);

    let app: Router = Router::new()
        .route("/", get(handler))
        .layer(TraceLayer::new_for_http())
        .with_state(state.clone());

    let listener = TcpListener::bind((state.config.address.as_str(), state.config.port)).await?;
    tracing::info!(
        "listening on {}:{}",
        state.config.address,
        state.config.port
    );
    axum::serve(listener, app).await?;

    Ok(())
}

async fn handler() -> Html<&'static str> {
    Html("<h1>Hello World</h1>")
}
