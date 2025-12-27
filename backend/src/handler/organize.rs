use axum::extract::{Path, State};

use crate::{auth::User, handler::Problem, state::AppState, store};

pub async fn organize(
    State(state): State<AppState>,
    Path(store_id): Path<i64>,
    _: User,
) -> Result<(), Problem> {
    let (items, sections) = tokio::try_join!(
        store::item::unassigned_for_store(&state.db, store_id),
        store::section::list(&state.db, store_id),
    )?;

    let schema = serde_json::json!({
        "type": "object",
        "required": ["categorized"],
        "properties": {
            "categorized": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": [
                        "category_id",
                        "item_id"
                    ],
                    "properties": {
                        "category_id": {
                            "type": "integer"
                        },
                        "item_id": {
                            "type": "integer"
                        }
                    }
                }
            }
        }
    });

    Ok(())
}
