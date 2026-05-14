/**
 * Quick PDF text-layer check.
 * Usage:  node test-pdf.mjs <path-to-pdf>
 *
 * Drop your PDF anywhere and pass the path as the first argument.
 * Reports: total pages, whether text is extractable, and a sample of extracted text.
 */

import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const require = createRequire(import.meta.url)

// Use the pdfjs-dist already installed under apps/web
const pdfjsPath = new URL(
  './apps/web/node_modules/pdfjs-dist/legacy/build/pdf.mjs',
  import.meta.url,
)

const pdfjs = await import(pdfjsPath.href)

// Node.js mode — disable worker entirely
pdfjs.GlobalWorkerOptions.workerSrc = ''

const pdfPath = process.argv[2]
if (!pdfPath) {
  console.error('Usage: node test-pdf.mjs <path-to-pdf>')
  process.exit(1)
}

const absPath = resolve(pdfPath)
console.log(`\nChecking: ${absPath}\n`)

let data
try {
  data = readFileSync(absPath)
} catch (e) {
  console.error(`Cannot read file: ${e.message}`)
  process.exit(1)
}

let doc
try {
  doc = await pdfjs.getDocument({ data: new Uint8Array(data), useSystemFonts: true }).promise
} catch (e) {
  console.error(`Failed to open PDF: ${e.message}`)
  process.exit(1)
}

const total = doc.numPages
console.log(`Total pages : ${total}`)

let pagesWithText = 0
let totalChars = 0
const samples = []

const pagesToCheck = Math.min(total, 20) // check first 20 pages

for (let i = 1; i <= pagesToCheck; i++) {
  const page = await doc.getPage(i)
  const tc = await page.getTextContent()
  const text = tc.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length > 0) {
    pagesWithText++
    totalChars += text.length
    if (samples.length < 3) {
      samples.push({ page: i, preview: text.substring(0, 120) })
    }
  }
}

console.log(`Pages checked   : ${pagesToCheck}`)
console.log(`Pages with text : ${pagesWithText} / ${pagesToCheck}`)
console.log(`Total chars     : ${totalChars}`)
console.log(``)

if (pagesWithText === 0) {
  console.log('❌  SCANNED / IMAGE PDF — no text layer found.')
  console.log('   pdfjs cannot extract text. You need a PDF with a text layer.')
  console.log('   Try downloading the textbook from the official SCERT/NCERT website.')
} else {
  console.log('✅  TEXT-BASED PDF — text is extractable.\n')
  console.log('Sample text from first pages with content:')
  for (const s of samples) {
    console.log(`\n  [Page ${s.page}] ${s.preview}…`)
  }
}

await doc.destroy()
