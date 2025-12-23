use argon2::{Argon2, PasswordHash, PasswordVerifier};
use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum_extra::extract::CookieJar;
use axum_extra::extract::cookie::{Cookie, SameSite};
use serde::Deserialize;

use crate::{db::Db, handler::Problem, store};

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum AuthType {
    Web,
}

#[derive(Deserialize)]
pub struct Credentials {
    auth_type: AuthType,
    username: String,
    password: String,
}

pub enum LoginError {
    InvalidCredentials,
    Internal,
}

impl IntoResponse for LoginError {
    fn into_response(self) -> axum::response::Response {
        let problem = match self {
            LoginError::InvalidCredentials => {
                Problem::new(StatusCode::UNAUTHORIZED, "Invalid credentials".to_string())
            }
            LoginError::Internal => Problem::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error".to_string(),
            ),
        };
        problem.into_response()
    }
}

pub async fn login(
    State(db): State<Db>,
    jar: CookieJar,
    Json(credentials): Json<Credentials>,
) -> Result<(StatusCode, CookieJar), LoginError> {
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

    // Set new cookie
    let cookie = Cookie::build(("session", "TODO"))
        .path("/api")
        .secure(true)
        .http_only(true)
        .same_site(SameSite::Lax);

    Ok((StatusCode::NO_CONTENT, jar.add(cookie)))
}
