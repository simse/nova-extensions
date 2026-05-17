# Oxc Tools

A [Nova](https://nova.app) extension that brings the [Oxc](https://oxc.rs) toolchain into the editor: lint diagnostics from [oxlint](https://oxc.rs/docs/guide/usage/linter.html) and format-on-save from [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html).

## Supported file types

**Linting (oxlint):** JavaScript, TypeScript, JSX, TSX.

**Formatting (oxfmt):** JavaScript, TypeScript, JSX, TSX, Vue, Svelte, CSS, SCSS, Less, HTML, JSON, YAML, Markdown, GraphQL, TOML.

## Requirements

`oxlint` and `oxfmt` must be installed in your workspace:

```sh
pnpm add -D oxlint oxfmt
```

## Commands

Available under **Extensions → Oxc Tools**:

- **Restart oxlint Server**
- **Restart oxfmt Server**

Each server also restarts automatically when its config file changes.
