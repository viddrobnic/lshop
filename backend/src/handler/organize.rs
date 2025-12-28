use async_openai::{
    error::OpenAIError,
    types::responses::{CreateResponseArgs, ReasoningEffort, ResponseFormatJsonSchema},
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    auth::User,
    handler::Problem,
    state::{AppState, OpenAiClient},
    store,
};

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

#[derive(Debug, Deserialize)]
struct Categorization {
    section_id: i64,
    item_id: i64,
}

#[derive(Debug, Deserialize)]
struct CategorizationResponse {
    categorized: Vec<Categorization>,
}

pub async fn organize(
    State(state): State<AppState>,
    Path(store_id): Path<i64>,
    _: User,
) -> Result<StatusCode, Problem> {
    let (items, sections) = tokio::try_join!(
        store::item::unassigned_for_store(&state.db, store_id),
        store::section::list(&state.db, store_id),
    )?;

    let categorized = openai_organize(&state.openai, items, sections)
        .await
        .map_err(|err| {
            tracing::error!(
                error = err.to_string(),
                "error during ai categorization: {err}"
            );
            Problem::internal()
        })?;

    // TODO: Save to db

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Error)]
enum PromptError {
    #[error("openai error")]
    OpenAi(#[from] OpenAIError),

    #[error("invalid response recieved")]
    InvalidResponse(#[from] serde_json::Error),
}

async fn openai_organize(
    openai: &OpenAiClient,
    items: Vec<store::item::Item>,
    sections: Vec<store::section::Section>,
) -> Result<CategorizationResponse, PromptError> {
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

    let prompt_data = Prompt {
        items: items.into_iter().map(|it| it.into()).collect(),
        sections: sections.into_iter().map(|sec| sec.into()).collect(),
    };
    let prompt_data = serde_json::to_string(&prompt_data).expect("prompt should be valid json");

    let prompt = format!(
        "You are a helpful store manager assistant. You are given a list of store sections and items. Your task is to organize the items into sections and return the mapping.\n\nEach item can be in at most one section. If an item doesn't belong in any of the sections, ignore it.\n\n{prompt_data}"
    );

    let request = CreateResponseArgs::default()
        .model("gpt-5-mini")
        .reasoning(ReasoningEffort::Minimal)
        .text(ResponseFormatJsonSchema {
            description: Some("Mapping of items to sections".to_string()),
            name: "categorization".to_string(),
            schema: Some(schema),
            strict: Some(true),
        })
        .input(prompt)
        .build()?;

    let response = openai.responses().create(request).await?;

    let Some(response_text) = response.output_text() else {
        return Ok(CategorizationResponse {
            categorized: vec![],
        });
    };

    let categorized = serde_json::from_str(&response_text)?;
    Ok(categorized)
}
