use sea_query::Iden;

#[derive(Iden)]
pub enum Users {
    Table,
    Id,
    Username,
    PasswordHash,
    CreatedAt,
    UpdatedAt,
}
