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
- [ ] reorder (inside store)

## Item

- [ ] create
- [ ] list -> returns all grouped by stores and sections, ie

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

- [ ] update (rename, change section or store)
- [ ] delete
- [ ] move -> specify store id, section id and order index
- [ ] organize -> run llm to organize through sections
