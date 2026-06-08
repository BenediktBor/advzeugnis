import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const svgPath = resolve(root, 'public/favicon.svg')
const pngPath = resolve(root, 'public/email-icon.png')

const svg = readFileSync(svgPath)
const png = await sharp(svg, { density: 300 })
	.resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
	.png()
	.toBuffer()

writeFileSync(pngPath, png)
console.log(`Wrote ${pngPath}`)
