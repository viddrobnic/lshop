use axum::extract::{FromRequestParts, OptionalFromRequestParts};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum_extra::extract::CookieJar;
use base64::prelude::*;
use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::db::Db;
use crate::handler::Problem;
use crate::state::AppState;
use crate::store;
use crate::util::to_hex;

#[derive(Serialize)]
pub struct User {
    pub id: i64,
    pub username: String,

    #[serde(skip_serializing)]
    pub session_hash: String,

    #[serde(with = "time::serde::rfc3339")]
    pub created_at: time::OffsetDateTime,

    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: time::OffsetDateTime,
}

// Manual debug implementation to avoid logging session hash
impl std::fmt::Debug for User {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("User")
            .field("id", &self.id)
            .field("username", &self.username)
            .field("created_at", &self.created_at)
            .field("updated_at", &self.updated_at)
            .finish()
    }
}

impl From<(store::user::User, String)> for User {
    fn from(value: (store::user::User, String)) -> Self {
        Self {
            id: value.0.id,
            session_hash: value.1,
            username: value.0.username,
            created_at: value.0.created_at,
            updated_at: value.0.updated_at,
        }
    }
}

pub enum AuthError {
    InvalidCredentials,
    MissingCredentials,
    Internal,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> axum::response::Response {
        let problem = match self {
            AuthError::InvalidCredentials => Problem::invalid_credentials(),
            AuthError::MissingCredentials => {
                Problem::new(StatusCode::UNAUTHORIZED, "Missing credentials".to_string())
            }
            AuthError::Internal => Problem::internal(),
        };

        problem.into_response()
    }
}

impl FromRequestParts<AppState> for User {
    type Rejection = AuthError;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let jar = CookieJar::from_headers(&parts.headers);
        let Some(cookie) = jar.get("session") else {
            return Err(AuthError::MissingCredentials);
        };

        get_user_from_session(&state.db, cookie.value()).await
    }
}

impl OptionalFromRequestParts<AppState> for User {
    type Rejection = AuthError;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        state: &AppState,
    ) -> Result<Option<Self>, Self::Rejection> {
        let jar = CookieJar::from_headers(&parts.headers);
        let Some(cookie) = jar.get("session") else {
            return Ok(None);
        };

        let user = get_user_from_session(&state.db, cookie.value()).await?;
        Ok(Some(user))
    }
}

async fn get_user_from_session(db: &Db, sess: &str) -> Result<User, AuthError> {
    let Ok(sess_bytes) = BASE64_URL_SAFE_NO_PAD.decode(sess) else {
        return Err(AuthError::InvalidCredentials);
    };
    let sess_hash = to_hex(&Sha256::digest(sess_bytes)[..]);

    let user = store::user::get_session(db, &sess_hash).await;
    match user {
        Ok(Some(u)) => Ok((u, sess_hash).into()),
        Ok(None) => Err(AuthError::InvalidCredentials),
        Err(err) => {
            tracing::error!(error = err.to_string(), "database error: {err}");
            Err(AuthError::Internal)
        }
    }
}
