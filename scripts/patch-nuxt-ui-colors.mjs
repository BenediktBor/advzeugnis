import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const pluginPath = resolve(
	process.cwd(),
	'node_modules/@nuxt/ui/dist/runtime/plugins/colors.js'
)

const oldSnippet = `  if (import.meta.client && nuxtApp.isHydrating && !nuxtApp.payload.serverRendered) {
    const style = document.createElement("style");
    style.innerHTML = root.value;
    style.setAttribute("data-nuxt-ui-colors", "");
    document.head.appendChild(style);
    headData.script = [{
      innerHTML: "document.head.removeChild(document.querySelector('[data-nuxt-ui-colors]'))"
    }];
  }
  useHead(headData);`

const newSnippet = `  if (import.meta.client && !nuxtApp.payload.serverRendered) {
    let style = document.querySelector("#nuxt-ui-colors");
    if (!style) {
      style = document.createElement("style");
      style.setAttribute("id", "nuxt-ui-colors");
      document.head.appendChild(style);
    }
    style.innerHTML = root.value;
    return;
  }
  useHead(headData);`

const source = await readFile(pluginPath, 'utf8')

if (source.includes(newSnippet)) {
	process.exit(0)
}

if (!source.includes(oldSnippet)) {
	throw new Error('Unexpected @nuxt/ui colors plugin format')
}

await writeFile(pluginPath, source.replace(oldSnippet, newSnippet))
