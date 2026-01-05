# L(ist) Shop

Self hosted tool for managing and sharing a shopping list across the whole family.

## Motivation

Usually my wife creates most of the shopping list and I am the one that goes to the store. Since I am on Android and
she is on iOS, this results in me getting screenshots of the Reminders app. Out of the frustration of dealing with
screenshots, I built this tool.

### Features

- Self hosted web app, with good mobile support
- Shared items: items are automatically shared between all users on the server
- Automatic item sorting

The last point also sets the app apart from a normal to-do list. There are only a couple of stores that we regularly
visit. This app allows you to define a store and its sections, just the way they are ordered in the store. You add items
normally, like on a to-do list. But before you go to the store, you press the "Sort" button and with the help of an LLM,
items get sorted into appropriate sections. When you walk through the store, you can read the shopping list a lot more
linearly, instead of jumping between items based on which section you are in.

## Deployment

I currently don't provide any setup scripts, but this app should be quite easy to deploy.

### Requirements:

- For building backend you need rust
- For building frontend you need bun

### Build

1. Build backend
   ```sh
   cd backend
   cargo build --release
   ```
2. Build frontend
   ```sh
   cd frontend
   bun install
   bun run build
   ```

### Configure Backend

The backend has some settings that you might want to tweak. The easiest way to do this is by providing an `.env` file
at the same location as the executable, or by setting the environment variables directly. The notable variables you
want to set are:

```env
ENVIRONMENT="prod"
PORT=8000
OPENAI_API_KEY="<your-key>"
```

### Create Users

Users need to be created on the server with the `create-user` command:

```sh
./lshop-backend create-user
```

The command will ask you for username and password.

### Serve

For serving the app, you will need a domain and a reverse proxy like `caddy` or `nginx`. Both backend and frontend should
be on the same domain. Specifically:

- `/api` -> reverse proxy to the backend
- `/*` -> try serving the requested path, otherwise fallback to `index.html`. Fallback is important because this is a SPA
  with client side routing.

Here is an example config for caddy you might want to use:

```caddy
shop.example.com {
    encode zstd gzip
    root * /var/www/shop

    handle /api* {
        reverse_proxy localhost:8000
        header Cache-Control "no-store, no-cache, must-revalidate"
    }

    handle /assets* {
        file_server
        header Cache-Control "public, max-age=31536000, immutable"
    }

    handle {
        try_files {path} /index.html
        file_server
    }
}
```

## License

This project is licensed under the [MIT license](./LICENSE).
