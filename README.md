# Timetjek

A time tracking application built with Vue 3, TypeScript, and Tailwind CSS.
Project for Timetjek in collaboration with DevelopersShore https://drive.google.com/drive/folders/1YEQX4CcguYidlzG-cMkzyOTKSd6LgvB6?usp=sharinggit

Project for Timetjek in collaboration with DevelopersShore https://drive.google.com/drive/folders/1YEQX4CcguYidlzG-cMkzyOTKSd6LgvB6?usp=sharing

## Tech Stack

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS framework
- **Pinia** - State management for Vue

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── assets/          # Static assets
├── components/      # Vue components
├── App.vue          # Root component
├── main.ts          # Application entry point
└── style.css        # Global styles with Tailwind
```

## Tailwind CSS v4

This project uses Tailwind CSS v4, which has a CSS-first configuration approach. Customize styles in `src/style.css` using the `@theme` directive instead of a JavaScript config file.



## Database Schema Versioning & Migrations (PoC)

**Migration/versioning strategy summary:**

The application uses a linear, append-only migration strategy for the local SQLite database. The initial schema is defined as a SQL string. Every schema change is added as a new SQL statement in a migration array. On startup, a migration runner applies all migrations in order, ensuring both new and existing databases are up-to-date. Migrations are never removed or reordered, and each migration is idempotent, so it is safe to run them multiple times. This approach ensures reliable upgrades and easy schema evolution for both development and production environments.

This project uses a simple, robust migration strategy for evolving the local SQLite schema, supporting both initial schema setup and incremental migrations.

### How it works

- **Initial schema**: Defined as a SQL string (e.g. `STAFF_REGISTER_SCHEMA`) with all tables and columns for a fresh install.
- **Migrations**: Each schema change (e.g. adding a column) is a new SQL statement in the `STAFF_REGISTER_MIGRATIONS` array.
- **Migration runner**: The `runMigrations` utility applies each migration in order, skipping those that are already applied (idempotent by design).

### Example: Adding a new column

Suppose you want to add a `notes` column to `work_entries`:

In `src/db/staff-register/schema.ts`:

```typescript
export const STAFF_REGISTER_MIGRATIONS: string[] = [
	// Example: Add notes column
	'ALTER TABLE work_entries ADD COLUMN notes TEXT',
	// Add more migrations here as needed
]
```

In `src/db/staff-register/init.ts`:

```typescript
import { STAFF_REGISTER_SCHEMA, STAFF_REGISTER_MIGRATIONS } from './schema'
import { runMigrations } from '../migrate'

export async function initStaffRegisterDb(db: any, isNative: boolean) {
	if (isNative) {
		await db.execute(STAFF_REGISTER_SCHEMA)
		await runMigrations((sql) => db.execute(sql), STAFF_REGISTER_MIGRATIONS)
	} else {
		db.run(STAFF_REGISTER_SCHEMA)
		await runMigrations((sql) => db.run(sql), STAFF_REGISTER_MIGRATIONS)
	}
}
```

### Best Practices

- **Never remove or reorder migrations** in the array; always append new ones.
- **Each migration must be idempotent** (safe to run multiple times).
- **Test migrations** on both fresh and existing databases.

### See also
- `src/db/migrate.ts` for the migration runner utility
- `src/db/staff-register/schema.ts` for schema and migrations
- `src/db/staff-register/init.ts` for initialization logic

---

## License

Private
