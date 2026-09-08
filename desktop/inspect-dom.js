const { app, BrowserWindow } = require("electron");
const path = require("path");

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });

  win.webContents.on("console-message", (event, level, message, line, sourceId) => {
    console.log("[Console " + level + "]", message);
  });

  await win.loadFile(path.join(__dirname, "dist", "index.html"));
  await new Promise(r => setTimeout(r, 1000));

  const result = await win.webContents.executeJavaScript(`
    (() => {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      const allEls = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      return {
        topElement: el ? { tag: el.tagName, id: el.id, class: el.className, text: el.innerText ? el.innerText.slice(0, 50) : "" } : null,
        stack: allEls.map(e => ({ tag: e.tagName, id: e.id, class: e.className, pointerEvents: window.getComputedStyle(e).pointerEvents })),
        bodyChildren: Array.from(document.body.children).map(c => ({ tag: c.tagName, id: c.id, class: c.className, style: c.getAttribute("style") }))
      };
    })()
  `);

  console.log("INSPECTION RESULT:", JSON.stringify(result, null, 2));
  app.quit();
});
