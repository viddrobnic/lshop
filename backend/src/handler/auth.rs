use argon2::{Argon2, PasswordHash, PasswordVerifier};
use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum_extra::extract::CookieJar;
use axum_extra::extract::cookie::{Cookie, SameSite};
use base64::Engine;
use base64::prelude::BASE64_URL_SAFE_NO_PAD;
use rand::TryRngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::auth::User;
use crate::util::to_hex;
use crate::{db::Db, handler::Problem, store};

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum AuthType {
    Web,
}

#[derive(Deserialize)]
pub struct Credentials {
    // auth_type is future compatibility, we don't use it yet
    #[allow(unused)]
    auth_type: AuthType,
    username: String,
    password: String,
}

pub enum LoginError {
    InvalidCredentials,
    Internal,
}

#[derive(Serialize)]
pub struct Session {
    session: String,

    #[serde(with = "time::serde::rfc3339")]
    expires_at: time::OffsetDateTime,
}

impl IntoResponse for LoginError {
    fn into_response(self) -> axum::response::Response {
        let problem = match self {
            LoginError::InvalidCredentials => Problem::invalid_credentials(),
            LoginError::Internal => Problem::internal(),
        };
        problem.into_response()
    }
}

pub async fn login(
    State(db): State<Db>,
    jar: CookieJar,
    Json(credentials): Json<Credentials>,
) -> Result<(CookieJar, Json<Session>), LoginError> {
    // Get user from db
    let user_res = store::user::get_user(&db, &credentials.username).await;
    let user = match user_res {
        Ok(Some(u)) => u,
        Ok(None) => return Err(LoginError::InvalidCredentials),
        Err(err) => {
            tracing::error!(error = err.to_string(), "database error: {err}");
            return Err(LoginError::Internal);
        }
    };

    // Check password is correct
    let hash = PasswordHash::new(&user.password_hash).map_err(|err| {
        tracing::error!(error = err.to_string(), "password hash error: {err}");
        LoginError::Internal
    })?;
    let argon2 = Argon2::default();

    let pass_check = argon2.verify_password(credentials.password.as_bytes(), &hash);
    if pass_check.is_err() {
        return Err(LoginError::InvalidCredentials);
    }

    // Create new session
    let session = create_session(&db, user.id).await.map_err(|err| {
        tracing::error!(
            error = err.to_string(),
            "database error during session generation: {err}"
        );
        LoginError::Internal
    })?;

    // Set new cookie
    let cookie = Cookie::build(("session", session.session.clone()))
        .path("/api")
        .secure(true)
        .http_only(true)
        .same_site(SameSite::Lax);

    Ok((jar.add(cookie), Json(session)))
}

pub async fn logout(
    State(db): State<Db>,
    user: User,
    jar: CookieJar,
) -> Result<(StatusCode, CookieJar), Problem> {
    let res = store::user::delete_session(&db, &user.session_hash).await;
    if let Err(err) = res {
        tracing::error!(error = err.to_string(), "database error: {err}");
        return Err(Problem::internal());
    }

    Ok((StatusCode::NO_CONTENT, jar.remove("session")))
}

pub async fn me(user: User) -> Json<User> {
    Json(user)
}

async fn create_session(db: &Db, user_id: i64) -> Result<Session, sqlx::Error> {
    let mut sess_bytes = [0u8; 64];
    rand::rngs::OsRng
        .try_fill_bytes(&mut sess_bytes)
        .expect("random should not fail");

    let sess_str = BASE64_URL_SAFE_NO_PAD.encode(sess_bytes);
    let sess_hash = to_hex(&Sha256::digest(sess_bytes)[..]);
    let expires_at = time::OffsetDateTime::now_utc() + time::Duration::days(30);

    store::user::create_session(db, user_id, &sess_hash, expires_at).await?;

    Ok(Session {
        session: sess_str,
        expires_at,
    })
}
