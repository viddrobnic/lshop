use axum::Router;
use axum::routing::{get, post, put};
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;

use crate::handler::{auth, store};
use crate::state::AppState;

pub async fn start_server(state: AppState) -> anyhow::Result<()> {
    let app: Router = Router::new()
        .nest(
            "/api",
            Router::new()
                .nest(
                    "/auth",
                    Router::new()
                        .route("/login", post(auth::login))
                        .route("/logout", post(auth::logout))
                        .route("/me", get(auth::me)),
                )
                .nest(
                    "/stores",
                    Router::new()
                        .route("/", post(store::create).get(store::list))
                        .route("/{id}", put(store::update).delete(store::delete)),
                ),
        )
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
