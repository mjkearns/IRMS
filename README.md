# IRMS - Intelligent Range Management System

# Basic Structure

# LERNA - Tool for managing JavaScript projects

This repository is setup with Lerna (lerna.js.org) to provide a tool to manage a mono-repository of javascript projects.

Lerna manages package dependencies, avoids duplication and allows commands to be run across multiple individual code bases.

lerna.json - contains the configuration settings for Lerna.

## Development impacts

During development use the typical NPM commands to install production and development dependencies. Ensure when doing this you are updating the package.json file (npm does this by default now).

You do NOT push your node_modules up with your changes, by default the .gitignore rules should prevent this.

When you pull down changes, you may need to update your node modules, this can be done by running from the root repository folder:

```
npm run bootstrap
```

## To de-duplicate node_modules across multiple projects

Node resolves its dependencies by progressively iterating up the file paths checking for /node_modules/ - we can leverage off this to avoid the same node module being installed in multiple projects in the mono-repository.

```
# clean node modules from all projects - this will remove node_modules folders from all child projects
npx lerna clean --yes

# update the root level node_modules folder with all packages required by the child projects
npx lerna bootstrap --hoist
```

NPM shortcuts have been added to the root level package.json to do these commands for you, from the root directory of the repository:

```
# this will clean and bootstrap everything for you
npm bootstrap
```

## Running NPM commands across all the projects

This will process each project code, check the package.json files contain within those folders and execute 'npm run < script >' that matches the "scripts" object in the package.json file.

```
npx lerna run <npm script command>

# eg run all test commands in each projects package.json file
npx lerna run test

# eg start all the projects
npx lerna run start
```

Again there are NPM shortcuts for this in the root package.json:

```
npm run test
npm run start
```

# PRETTIER - Opinionated Code Formatter

Prettier (prettier.io) provides code formatting based on a standard set of rules.

The VSCode plugin for this is 'prettier-vscode "Prettier - Code Formatter"'.

There are plugins available for other editors. It is strongly suggested you ensure the VSCode formats the files on save - this is set by default for VSCode in this repository (.vscode/settings.json).

## Manual Commands

```
# format and write the changes
npx prettier --write .

# check files pass formatting
npx prettier --check .
```

Note: care may be required if different projects use different Prettier versions (i.e. Prettier installed in project folder as well) - as the formatting rules may differ!
