import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: 'file:./app.db'
  },
  migrations: {
    table: 'drizzle_migrations',
    schema: '__drizzle_migrations__'
  }
})
