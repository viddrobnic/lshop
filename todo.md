# TODO

The following endpoints have to be implemented

## Store

- [x] create
- [x] list
- [x] update (rename)
- [x] delete

## Section

- [x] create
- [x] list
- [x] update (rename)
- [x] delete
- [x] reorder (inside store)

## Item

- [x] create
- [x] list -> returns all grouped by stores and sections, ie

  ```json
  {
      "unordered": [...], // items
      "stores": [
          {
              "id": "store-id",
              "name": "store-name",
              "unordered": [...], // items
              "sections": [
                  {
                      "id": "section-id",
                      "name": "section-name",
                      "items": [...]
                  }
              ]
          }
      ]

  }
  ```

- [ ] update (rename)
- [ ] delete
- [x] move -> specify store id, section id and order index
- [x] check & uncheck with currect index update
- [x] organize -> run llm to organize through sections
- [ ] update ordering index when section or store is deleted and items are moved to unassigned
- [ ] list archived (checked) -> only order by updated at desc

## Improvements:

- [ ] On move use offset to get item at target index, and use it's ord. this should make it robust towards holes.
- [x] Error handling
