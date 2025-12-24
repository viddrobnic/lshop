use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Serialize, ser::SerializeStruct};

pub mod auth;
pub mod store;

pub struct Problem {
    pub status: StatusCode,
    pub message: String,
}

// Manual implementation of Serialize, because StatusCode doesn't implement it.
impl Serialize for Problem {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("Problem", 2)?;
        state.serialize_field("status", &self.status.as_u16())?;
        state.serialize_field("message", &self.message)?;
        state.end()
    }
}

impl IntoResponse for Problem {
    fn into_response(self) -> axum::response::Response {
        (self.status, Json(self)).into_response()
    }
}

impl Problem {
    pub fn new(status: StatusCode, message: String) -> Self {
        Self { status, message }
    }

    pub fn internal() -> Self {
        Problem::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Internal Server Error".to_string(),
        )
    }

    pub fn invalid_credentials() -> Self {
        Problem::new(StatusCode::UNAUTHORIZED, "Invalid credentials".to_string())
    }

    pub fn not_found() -> Self {
        Problem::new(StatusCode::NOT_FOUND, "Not found".to_string())
    }
}
