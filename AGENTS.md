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
