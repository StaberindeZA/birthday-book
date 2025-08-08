# Birthday Book

A web application for managing birthdays with sharing capabilities.

## Features

- User authentication with email codes
- Birthday management with sorting by upcoming dates
- Filter birthdays by time periods (week, month, 3 months, 6 months)
- Share birthday book with friends via unique links
- Delete birthdays and sharing links

## Environment Variables

The application supports the following environment variables. The application will automatically load variables from a `.env` file if present.

### Setup
```bash
# Copy the example file
cp .env.example .env
# Edit .env with your configuration
```

### Loading Methods
1. **`.env` file (recommended)**: Create a `.env` file in the project root
2. **System environment variables**: Set variables in your shell
3. **Inline variables**: Pass variables directly to the deno command

**Example .env file:**
```bash
SHARE_DOMAIN=https://mybirthdaybook.com
PORT=8000
DATABASE_PATH=birthday_book.db
```

### `SHARE_DOMAIN`
Configures the domain used for sharing links. If not set, the application will use the request origin.

**Examples:**
```bash
# For production
SHARE_DOMAIN=https://mybirthdaybook.com

# For development
SHARE_DOMAIN=http://localhost:8000

# For custom domain
SHARE_DOMAIN=https://birthdays.example.com
```

### `PORT`
Configures the port the server runs on. Defaults to 8000.

**Example:**
```bash
PORT=3000
```

### `DATABASE_PATH`
Configures the path to the SQLite database file. Defaults to `birthday_book.db`.

**Examples:**
```bash
# Custom database path
DATABASE_PATH=./data/birthday_book.db

# Absolute path
DATABASE_PATH=/var/lib/birthday_book/database.db
```

## Running the Application

### Development
```bash
# Copy environment example and configure
cp .env.example .env
# Edit .env with your settings

# Start with .env file (recommended)
deno run --allow-net --allow-read --allow-write --allow-env main.ts

# Or start with inline environment variables
SHARE_DOMAIN=https://mybirthdaybook.com deno run --allow-net --allow-read --allow-write --allow-env main.ts
PORT=3000 deno run --allow-net --allow-read --allow-write --allow-env main.ts
```

### Production
```bash
# Copy and configure environment file
cp .env.example .env
# Edit .env with production settings

# Or set environment variables directly
export SHARE_DOMAIN=https://mybirthdaybook.com
export PORT=8000
export DATABASE_PATH=/var/lib/birthday_book/database.db

# Run the application
deno run --allow-net --allow-read --allow-write --allow-env main.ts
```

## Database

Initialize the database:
```bash
deno run --allow-read --allow-write db_init.ts
```

## API Endpoints

### Authentication
- `POST /auth/request` - Request login code
- `POST /auth/verify` - Verify login code

### Birthdays
- `GET /birthdays` - Get user's birthdays
- `POST /birthdays` - Add new birthday
- `DELETE /birthdays/:id` - Delete birthday

### Sharing
- `POST /sharing/links` - Generate sharing link
- `GET /sharing/links` - Get user's sharing links
- `GET /sharing/links/:token` - Validate sharing link
- `POST /sharing/links/:token/birthdays` - Add birthday via sharing link
- `DELETE /sharing/links/:id` - Deactivate sharing link

## Frontend Pages

- `/` - Login page
- `/home` - Main application (requires authentication)
- `/share/:token` - Share page for friends to add birthdays
