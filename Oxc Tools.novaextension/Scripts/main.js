const RESTART_DEBOUNCE_MS = 500;

const oxfmtSyntaxes = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "vue",
  "svelte",
  "css",
  "scss",
  "less",
  "html",
  "json",
  "yaml",
  "markdown",
  "graphql",
  "toml",
];
const oxlintSyntaxes = ["javascript", "typescript", "jsx", "tsx"];
const formatSyntaxes = new Set(oxfmtSyntaxes);

const servers = {
  oxfmt: {
    identifier: "io.simse.OxcTools.oxfmt",
    name: "oxfmt",
    path: "./node_modules/oxfmt/bin/oxfmt",
    syntaxes: oxfmtSyntaxes,
    configGlobs: [
      "**/.oxfmtrc.json",
      "**/.oxfmtrc.jsonc",
      "**/oxfmt.config.ts",
    ],
    client: null,
    watchers: [],
    restartTimer: null,
  },
  oxlint: {
    identifier: "io.simse.OxcTools.oxlint",
    name: "oxlint",
    path: "./node_modules/oxlint/bin/oxlint",
    syntaxes: oxlintSyntaxes,
    configGlobs: [
      "**/.oxlintrc.json",
      "**/oxlint.config.ts",
    ],
    client: null,
    watchers: [],
    restartTimer: null,
  },
};

exports.activate = function () {
  startServer(servers.oxfmt);
  startServer(servers.oxlint);
  installWatchers(servers.oxfmt);
  installWatchers(servers.oxlint);

  nova.commands.register("io.simse.OxcTools.restartOxlint", () =>
    restartServer(servers.oxlint)
  );
  nova.commands.register("io.simse.OxcTools.restartOxfmt", () =>
    restartServer(servers.oxfmt)
  );

  nova.workspace.onDidAddTextEditor((editor) => {
    editor.onWillSave(async (editor) => {
      const client = servers.oxfmt.client;
      if (!client || !client.running) return;
      if (!formatSyntaxes.has(editor.document.syntax)) return;
      await formatEditor(editor, client);
    });
  });
};

exports.deactivate = function () {
  disposeWatchers(servers.oxfmt);
  disposeWatchers(servers.oxlint);
  stopServer(servers.oxfmt);
  stopServer(servers.oxlint);
};

function startServer(server) {
  const client = new LanguageClient(
    server.identifier,
    server.name,
    { path: server.path, args: ["--lsp"], type: "stdio" },
    { syntaxes: server.syntaxes, debug: nova.inDevMode() }
  );

  client.onDidStop((err) => {
    if (err) {
      console.error(`${server.name} LSP stopped with error:`, err.message);
    }
  });

  try {
    client.start();
  } catch (err) {
    console.error(`Failed to start ${server.name} LSP:`, err.message);
  }

  server.client = client;
}

function stopServer(server) {
  if (server.client) {
    server.client.stop();
    server.client = null;
  }
}

function restartServer(server) {
  console.log(`Restarting ${server.name} LSP`);
  stopServer(server);
  startServer(server);
}

// Debounces filesystem events and absorbs nova.fs.watch's synthetic initial fire
// for files that already exist when watching begins.
function scheduleRestart(server) {
  if (server.restartTimer) {
    clearTimeout(server.restartTimer);
  }
  server.restartTimer = setTimeout(() => {
    server.restartTimer = null;
    restartServer(server);
  }, RESTART_DEBOUNCE_MS);
}

function installWatchers(server) {
  for (const glob of server.configGlobs) {
    server.watchers.push(
      nova.fs.watch(glob, () => scheduleRestart(server))
    );
  }
}

function disposeWatchers(server) {
  for (const w of server.watchers) {
    w.dispose();
  }
  server.watchers = [];
  if (server.restartTimer) {
    clearTimeout(server.restartTimer);
    server.restartTimer = null;
  }
}

async function formatEditor(editor, client) {
  const params = {
    textDocument: { uri: editor.document.uri },
    options: {
      tabSize: editor.tabLength,
      insertSpaces: editor.softTabs,
    },
  };

  let edits;
  try {
    edits = await client.sendRequest("textDocument/formatting", params);
  } catch (err) {
    console.error("oxfmt format request failed:", err.message);
    return;
  }
  if (!edits || edits.length === 0) return;

  await applyTextEdits(editor, edits);
}

function applyTextEdits(editor, edits) {
  const text = editor.getTextInRange(new Range(0, editor.document.length));
  const lineStarts = computeLineStarts(text);

  const offsetEdits = edits.map((edit) => ({
    start: lineStarts[edit.range.start.line] + edit.range.start.character,
    end: lineStarts[edit.range.end.line] + edit.range.end.character,
    newText: edit.newText,
  }));
  offsetEdits.sort((a, b) => b.start - a.start);

  return editor.edit((tee) => {
    for (const e of offsetEdits) {
      tee.replace(new Range(e.start, e.end), e.newText);
    }
  });
}

function computeLineStarts(text) {
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      lineStarts.push(i + 1);
    }
  }
  return lineStarts;
}
