## language

- all content for this site should be in French
- address the user with "tu", not with "vous"

## npm scripts

- if you make an npm script, create a file in /cli/commands called e.g. "cmd-name.ts" 
- and export a function called "execute" from it
- use any helper functions from /cli/qtools as needed
- or create your own in these directories and files under /cli
- but keep all parsing logic inside /cli to avoid polluting the nuxt app
- make sure every script runs with "tsx cli/commands/cmd-name.ts"
- so add the command to package.json as e.g.
    "mycommand": "tsx cli/commands/cmd-name.ts"

## database changes

- the Prisma schema is located at `prisma/schema.prisma`
- any time you edit `prisma/schema.prisma`, you must run `npm run prisma:generate` (or `npm run db:generate`) to update the Prisma Client types
- to apply non-destructive schema changes (such as adding nullable/default columns or creating new tables) to the Turso database, run `npm run prisma:push` (or `npm run db:push`)
- `npm run prisma:generate` / `npm run db:generate` only updates the TypeScript type definitions and client files (under `server/prisma/client`)
- NEVER run `npm run prisma:reset` or execute `DROP TABLE` in production scripts, as the database contains valuable user data that must never be lost
- if a schema migration requires a column rename or table alteration that `prisma db push` flags as potentially destructive, write an incremental SQL migration (`ALTER TABLE ...`) or ask the user before proceeding
