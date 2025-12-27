use axum::Router;
use axum::routing::{get, post, put};
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;

use crate::handler::{auth, item, organize, section, store};
use crate::state::AppState;

fn create_app(state: AppState) -> Router {
    Router::new()
        .nest(
            "/api",
            Router::new()
                // Auth
                .nest(
                    "/auth",
                    Router::new()
                        .route("/login", post(auth::login))
                        .route("/logout", post(auth::logout))
                        .route("/me", get(auth::me)),
                )
                // Stores
                .nest(
                    "/stores",
                    Router::new()
                        .route("/", post(store::create).get(store::list))
                        .route("/{store_id}", put(store::update).delete(store::delete)),
                )
                // Sections
                .nest(
                    "/stores/{store_id}/sections",
                    Router::new()
                        .route("/", get(section::list).post(section::create))
                        .route("/reorder", put(section::reorder)),
                )
                .nest(
                    "/sections",
                    Router::new().route("/{id}", put(section::update).delete(section::delete)),
                )
                // Items
                .nest(
                    "/items",
                    Router::new().route("/", get(item::list).post(item::create)),
                )
                // Organize
                .route("/stores/{store_id}/organize", post(organize::organize)),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

pub async fn start_server(state: AppState) -> anyhow::Result<()> {
    let app = create_app(state.clone());
    let listener = TcpListener::bind((state.config.address.as_str(), state.config.port)).await?;
    tracing::info!(
        "listening on {}:{}",
        state.config.address,
        state.config.port
    );
    axum::serve(listener, app).await?;

    Ok(())
}
