use config::ConfigError;
use serde::Deserialize;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Environment {
    #[default]
    Dev,
    Prod,
}

impl Environment {
    pub fn is_dev(&self) -> bool {
        *self == Environment::Dev
    }

    pub fn is_prod(&self) -> bool {
        *self == Environment::Prod
    }
}

#[derive(Debug, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub environment: Environment,

    pub address: String,
    pub port: u16,

    pub db_path: String,

    pub openai_api_key: String,
}

impl Config {
    pub fn new() -> Result<Self, ConfigError> {
        let default_conf = include_str!("../config.toml");
        let settings = config::Config::builder()
            .add_source(config::File::from_str(
                default_conf,
                config::FileFormat::Toml,
            ))
            .add_source(config::Environment::default())
            .build()?;

        settings.try_deserialize()
    }
}
