# IRMS - Intelligent Range Management System

# TLDR Summary

Suggested VSCode Plugins

- prettier-vscode "Prettier - Code Formatter"
- vscode-eslint "ESLint"

GIT Commits

- Modified files are made Prettier
- ESLint rules must pass

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

# HUSKY - Git Hooks

Husky (https://typicode.github.io/husky/#/) provides git hooks to allow linting, testing etc when you commit or push changes to the repository.

Husky should automatically hook into git when doing an 'npm install' on initially pulling down the repository.

Currently Husky adds a pre-commit hook, that runs lint-staged - which is controlled by the package.json to run prettier on staged files.

## Managing Hooks

```
# this will update .husky/pre-commit with an additional command to run
npx husky add .husky/pre-commit "< command to run >"
```

Another entry point for running commands on staged files is to modify the package.json "lint-staged" property.

Other possible git hook entry points include: applypatch, commit-msg, post-update, pre-applypatch, pre-commit, prepare-commit-msg, pre-push, pre-rebase, update

Attention: Husky changes git's core.hooksPath, this means the standard .git/hooks/ is no longer used and any other manual rules in this location are ignored.

## Git Version

This feature requires git version 2.9 or above, Ubuntu 16 appears to have version 2.7. You can upgrade git with the following:

```
# check current git version
git --version

sudo add-apt-repository ppa:git-core/ppa -y
sudo apt-get update
sudo apt-get install git -y
git --version
```

# ESLINT & STANDARDJS - Code linters and error checkers

ESLint (https://eslint.org/) finds and fixes problems in JavaScript code, StandardJS (https://standardjs.com/) provides a set of opinionated rules JavaScript files should follow to help prevent developer mistakes.

These have been installed to work with Prettier and Jest. This is configured through the "eslintConfig" property in the package.json file.

Adding the VSCode 'vscode-eslint "ESLint"' plugin will highlight errors while editing.

## Rule Overrides

Controlled by "rules": { ... }

- The prefer constant rule has been downgraded to a warning.

## Ignored Filters

Controlled by "ignorePatterns": [ ... ]

- any \*.js files in a /build/ folder as these are typically compiled bundles

## Manual Commands

```
# list the errors found
eslint .

# automatically fix those errors than can be corrected
eslint --fix .
```
