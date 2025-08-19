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

### `ALLOWED_ORIGINS`
Configures CORS allowed origins. Comma-separated list of domains. Defaults to `http://localhost:8000`.

**Examples:**
```bash
# Development
ALLOWED_ORIGINS=http://localhost:8000

# Production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Multiple environments
ALLOWED_ORIGINS=http://localhost:8000,https://staging.yourdomain.com,https://yourdomain.com
```

### Email Configuration
The following variables configure email sending for OTP codes:

#### `SMTP_HOST`
SMTP server hostname (e.g., `smtp.gmail.com`, `smtp.sendgrid.net`)

#### `SMTP_PORT`
SMTP server port (default: `587` for TLS)

#### `SMTP_USER`
SMTP username/email address

#### `SMTP_PASS`
SMTP password or app-specific password

**Examples:**
```bash
# Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Note:** If email configuration is not provided, OTP codes will be logged to the console for development purposes.

## Quick Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd birthday-book

# 2. Copy environment file
cp .env.example .env
# Edit .env with your settings

# Optional: Configure email for OTP delivery
# Edit .env and add your SMTP settings:
# SMTP_HOST=smtp.gmail.com
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# 3. Initialize database
deno run --allow-read --allow-write db_init.ts

# 4. Start the application
deno run --allow-net --allow-read --allow-write --allow-env main.ts

# 5. Open in browser
open http://localhost:8000
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

The application uses SQLite for data storage. The database file is not included in the repository and must be initialized before first use.

### Initialize Database

```bash
# Initialize the database (creates birthday_book.db)
deno run --allow-read --allow-write db_init.ts
```

### Database Location

The database file location can be configured using the `DATABASE_PATH` environment variable:

```bash
# Default location
DATABASE_PATH=birthday_book.db

# Custom location
DATABASE_PATH=./data/birthday_book.db

# Production location
DATABASE_PATH=/var/lib/birthday_book/database.db
```

### Database Schema

The application creates the following tables:
- `account` - User accounts and authentication
- `birthday` - Birthday entries
- `login_code` - Email verification codes
- `sharing_link` - Sharing links for birthday collection

### Backup Database

```bash
# Create a backup
cp birthday_book.db birthday_book_backup_$(date +%Y%m%d).db

# Restore from backup
cp birthday_book_backup_YYYYMMDD.db birthday_book.db
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
