use clap::{Parser, Subcommand};
use tracing::Level;
use tracing_subscriber::EnvFilter;

use crate::app::start_server;
use crate::config::Config;
use crate::state::AppState;

mod admin;
mod app;
mod config;
mod db;
mod handler;
mod state;
mod store;

#[derive(Debug, Parser)]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Debug, Subcommand)]
enum Command {
    CreateUser,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    let conf = Config::new()?;
    init_tracing(&conf);
    let db_pool = db::connect(&conf.db_path).await?;
    let state = AppState::new(db_pool, conf);

    match cli.command {
        None => start_server(state).await,
        Some(Command::CreateUser) => admin::create_user(state).await,
    }
}

fn init_tracing(conf: &Config) {
    if conf.environment.is_dev() {
        let filter = EnvFilter::new("debug,sqlx=info");
        tracing_subscriber::fmt().with_env_filter(filter).init();
    } else {
        tracing_subscriber::fmt()
            .json()
            .with_max_level(Level::INFO)
            .init();
    }
}
