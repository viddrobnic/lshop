# TODO

The following endpoints have to be implemented

## Store

- create
- list
- update (rename)
- delete
- reorder

## Section

- create
- list
- update (rename)
- delete
- reorder (inside store)

## Item

- create
- list -> returns all grouped by stores and sections, ie
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
- update (rename, change section or store)
- delete
- move -> specify store id, section id and order index
- organize -> run llm to organize through sections
