use argon2::Argon2;
use dialoguer::{Input, Password};
use password_hash::rand_core::OsRng;
use password_hash::{PasswordHasher, SaltString};

use crate::{state::AppState, store};

pub async fn create_user(state: AppState) -> anyhow::Result<()> {
    let username: String = Input::new().with_prompt("Username").interact()?;

    let password = Password::new()
        .with_prompt("New password")
        .with_confirmation("Confirm password", "Passwords don't match")
        .interact()?;

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let pass_hash = argon2.hash_password(password.as_bytes(), &salt)?;

    let res = store::user::create_user(state.db, &username, &pass_hash).await;
    match res {
        Ok(_) => (),
        Err(sqlx::Error::Database(db)) => {
            if db.code().as_ref().is_some_and(|c| c == "2067") {
                anyhow::bail!("User with username '{username}' already exists");
            } else {
                return Err(sqlx::Error::Database(db).into());
            }
        }
        Err(err) => return Err(err.into()),
    }

    println!("User '{username}' created successfully");
    Ok(())
}
