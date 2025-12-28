use async_openai::types::responses::{
    CreateResponseArgs, ReasoningEffort, ResponseFormatJsonSchema,
};
use axum::extract::{Path, State};
use serde::Serialize;

use crate::{auth::User, handler::Problem, state::AppState, store};

#[derive(Serialize)]
struct PromptItem {
    id: i64,
    name: String,
}

impl From<store::item::Item> for PromptItem {
    fn from(value: store::item::Item) -> Self {
        Self {
            id: value.id,
            name: value.name,
        }
    }
}

impl From<store::section::Section> for PromptItem {
    fn from(value: store::section::Section) -> Self {
        Self {
            id: value.id,
            name: value.name,
        }
    }
}

#[derive(Serialize)]
struct Prompt {
    items: Vec<PromptItem>,
    sections: Vec<PromptItem>,
}

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
                        "section_id",
                        "item_id"
                    ],
                    "properties": {
                        "section_id": {
                            "type": "integer"
                        },
                        "item_id": {
                            "type": "integer"
                        }
                    },
                    "additionalProperties": false,
                }
            }
        },
        "additionalProperties": false,
    });

    let prompt = Prompt {
        items: items.into_iter().map(|it| it.into()).collect(),
        sections: sections.into_iter().map(|sec| sec.into()).collect(),
    };
    let prompt = serde_json::to_string(&prompt).expect("prompt should be valid json");

    let request = CreateResponseArgs::default()
        .model("gpt-5-mini")
        .reasoning(ReasoningEffort::Minimal)
        .text(ResponseFormatJsonSchema {
            description: Some("Mapping of items to sections".to_string()),
            name: "categorization".to_string(),
            schema: Some(schema),
            strict: Some(true),
        })
        .input(format!(
            "You are a helpful store manager assistant. You are given a list of store sections and items. Your task is to organize the items into sections and return the mapping.\n\nEach item can be in at most one section. If an item doesn't belong in any of the sections, ignore it.\n\n{prompt}"
        ))
        .build()
        .map_err(|err| {
            tracing::error!(error = err.to_string(), "openai request build error: {err}");
            Problem::internal()
        })?;

    let response = state
        .openai
        .responses()
        .create(request)
        .await
        .map_err(|err| {
            tracing::error!(
                error = err.to_string(),
                "openai create response error: {err}"
            );
            Problem::internal()
        })?;

    println!("{:#?}", response.output);

    Ok(())
}
