use axum::{Router, response::Html, routing::get};
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;
use tracing::Level;

use crate::config::Config;

mod config;

fn init_tracing(conf: &Config) {
    if conf.environment.is_dev() {
        tracing_subscriber::fmt()
            .with_max_level(Level::DEBUG)
            .init();
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

    let app: Router = Router::new()
        .route("/", get(handler))
        .layer(TraceLayer::new_for_http());

    let listener = TcpListener::bind((conf.address.as_str(), conf.port)).await?;
    tracing::info!("listening on {}:{}", conf.address, conf.port);
    axum::serve(listener, app).await?;

    Ok(())
}

async fn handler() -> Html<&'static str> {
    Html("<h1>Hello World</h1>")
}
