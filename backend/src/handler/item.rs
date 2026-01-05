use std::{cmp::Ordering, collections::HashMap};

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};

use crate::{
    auth::User,
    db::Db,
    handler::Problem,
    store::{self, item::Item, section::Section, shop::Store},
};

#[derive(Deserialize)]
pub struct ItemCreateReq {
    pub store_id: Option<i64>,
    pub section_id: Option<i64>,
    pub name: String,
}

pub async fn create(
    State(db): State<Db>,
    _: User,
    Json(mut req): Json<ItemCreateReq>,
) -> Result<(StatusCode, Json<Item>), Problem> {
    // Check given store exists
    if let Some(store_id) = req.store_id {
        let store = store::shop::get(&db, store_id).await?;
        if store.is_none() {
            return Err(Problem::new(
                StatusCode::NOT_FOUND,
                "Store not found".to_string(),
            ));
        }
    }

    // Check section is valid
    if let Some(section_id) = req.section_id {
        // Check section exists
        let section = store::section::get(&db, section_id).await?;

        let Some(section) = section else {
            return Err(Problem::new(
                StatusCode::NOT_FOUND,
                "Section not found".to_string(),
            ));
        };

        // If store id is also given, check that it matches the section
        if let Some(store_id) = req.store_id
            && store_id != section.store_id
        {
            return Err(Problem::new(
                StatusCode::CONFLICT,
                "Section doesn't belong to the given store".to_string(),
            ));
        }

        // Set store_id to section's store id. This handles case when only section_id is given.
        req.store_id = Some(section.store_id);
    }

    // Insert to db
    let item = store::item::create(&db, req.store_id, req.section_id, &req.name).await?;

    Ok((StatusCode::CREATED, Json(item)))
}

#[derive(Serialize)]
pub struct ItemListSection {
    #[serde(flatten)]
    section: Section,

    items: Vec<Item>,
}

#[derive(Serialize)]
pub struct ItemListStore {
    #[serde(flatten)]
    store: Store,

    unassigned: Vec<Item>,
    sections: Vec<ItemListSection>,
}

#[derive(Serialize)]
pub struct ItemList {
    unassigned: Vec<Item>,
    stores: Vec<ItemListStore>,
}

pub async fn list(State(db): State<Db>, _: User) -> Result<Json<ItemList>, Problem> {
    // Get stuff from db
    let items = store::item::list(&db).await?;

    let (stores, sections) =
        tokio::try_join!(store::shop::list(&db), store::section::list_all(&db))?;

    // Construct hash maps
    let mut store_map: HashMap<i64, ItemListStore> = stores
        .into_iter()
        .map(|st| {
            (
                st.id,
                ItemListStore {
                    store: st,
                    unassigned: vec![],
                    sections: vec![],
                },
            )
        })
        .collect();

    let mut section_map: HashMap<i64, ItemListSection> = sections
        .into_iter()
        .map(|sec| {
            (
                sec.id,
                ItemListSection {
                    section: sec,
                    items: vec![],
                },
            )
        })
        .collect();

    let mut unassigned = vec![];

    for it in items {
        match (it.store_id, it.section_id) {
            (None, None) => unassigned.push(it),
            (Some(store_id), None) => {
                store_map
                    .entry(store_id)
                    .and_modify(|e| e.unassigned.push(it));
            }
            (Some(_), Some(section_id)) => {
                section_map
                    .entry(section_id)
                    .and_modify(|e| e.items.push(it));
            }
            (None, Some(_)) => unreachable!(),
        }
    }

    // Merge hash maps
    for sec in section_map.into_values() {
        store_map
            .entry(sec.section.store_id)
            .and_modify(|e| e.sections.push(sec));
    }

    let mut list = ItemList {
        unassigned,
        stores: store_map.into_values().collect(),
    };

    // Sort everything
    list.unassigned.sort_by(cmp_items);
    list.stores
        .sort_by(|a, b| match a.store.name.cmp(&b.store.name) {
            Ordering::Equal => b.store.updated_at.cmp(&a.store.updated_at),
            o => o,
        });

    for str in &mut list.stores {
        str.unassigned.sort_by(cmp_items);
        str.sections
            .sort_by(|a, b| match a.section.ord.cmp(&b.section.ord) {
                Ordering::Equal => b.section.updated_at.cmp(&a.section.updated_at),
                o => o,
            });

        for sec in &mut str.sections {
            sec.items.sort_by(cmp_items);
        }
    }

    Ok(Json(list))
}

#[derive(Deserialize)]
pub struct ItemRenameReq {
    name: String,
}

pub async fn rename(
    State(db): State<Db>,
    _: User,
    Path(id): Path<i64>,
    Json(req): Json<ItemRenameReq>,
) -> Result<Json<Item>, Problem> {
    let item = store::item::rename(&db, id, &req.name).await?;
    let Some(item) = item else {
        return Err(Problem::not_found());
    };

    Ok(Json(item))
}

pub async fn set_checked(
    State(db): State<Db>,
    _: User,
    Path(id): Path<i64>,
) -> Result<Json<Item>, Problem> {
    let item = store::item::set_checked(&db, id).await?;
    let Some(item) = item else {
        return Err(Problem::not_found());
    };

    Ok(Json(item))
}

#[derive(Deserialize)]
pub struct ItemMoveReq {
    store_id: Option<i64>,
    section_id: Option<i64>,
    index: i64,
}

pub async fn move_item(
    State(db): State<Db>,
    _: User,
    Path(id): Path<i64>,
    Json(req): Json<ItemMoveReq>,
) -> Result<Json<Item>, Problem> {
    let item = store::item::move_item(&db, id, req.store_id, req.section_id, req.index).await?;
    let Some(item) = item else {
        return Err(Problem::not_found());
    };

    Ok(Json(item))
}

fn cmp_items(a: &Item, b: &Item) -> Ordering {
    match a.ord.cmp(&b.ord) {
        Ordering::Equal => b.updated_at.cmp(&a.updated_at),
        o => o,
    }
}
