/* A small Excel (.xlsx) writer: plain sheets of text, a bold header row that
   stays in view, and sensible column widths. Enough for an export, with no
   library behind it.

   An .xlsx file is a zip of XML parts. The zip here is written "stored" (not
   compressed): the files are small, and it keeps this to arithmetic the
   browser can do by itself.

     makeXlsx([{ name, columns: [{ title, width }], rows: [[...], ...] }]) -> Blob
     saveBlob(blob, 'history.xlsx')                                              */

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

// & < > and quotes for XML; characters XML cannot carry at all are dropped
const esc = (value) =>
  String(value === null || value === undefined ? '' : value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// 0 -> A, 25 -> Z, 26 -> AA
const columnName = (index) => {
  let n = index + 1
  let name = ''
  while (n > 0) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

// Excel allows 31 characters in a sheet name and none of [ ] : * ? / \
const sheetNames = (sheets) => {
  const used = new Set()
  return sheets.map((sheet, i) => {
    const base = String(sheet.name || `Sheet ${i + 1}`).replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || `Sheet ${i + 1}`
    let name = base
    for (let n = 2; used.has(name.toLowerCase()); n += 1) name = `${base.slice(0, 28)} ${n}`
    used.add(name.toLowerCase())
    return name
  })
}

const cell = (ref, value, style) =>
  `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${esc(value)}</t></is></c>`

const sheetXml = ({ columns, rows }) => {
  const widths = columns
    .map((col, i) => `<col min="${i + 1}" max="${i + 1}" width="${col.width || 18}" customWidth="1"/>`)
    .join('')
  const header = `<row r="1">${columns.map((col, i) => cell(`${columnName(i)}1`, col.title, 1)).join('')}</row>`
  const body = rows
    .map((row, r) => `<row r="${r + 2}">${columns.map((_, i) => cell(`${columnName(i)}${r + 2}`, row[i])).join('')}</row>`)
    .join('')
  return (
    `${HEAD}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    // the header row stays put while the rest scrolls
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${widths}</cols><sheetData>${header}${body}</sheetData></worksheet>`
  )
}

// Two looks: ordinary text, and the bold header
const STYLES =
  `${HEAD}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>'

/* ---- the zip ---- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

const crc32 = (bytes) => {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// files: [{ path, text }] -> the bytes of a zip holding them, uncompressed
const zip = (files) => {
  const utf8 = new TextEncoder()
  const now = new Date()
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  const parts = []
  const directory = []
  let offset = 0

  files.forEach((file) => {
    const name = utf8.encode(file.path)
    const data = utf8.encode(file.text)
    const crc = crc32(data)
    // shared by the entry itself and its line in the directory
    const common = (view, at) => {
      view.setUint16(at, 20, true) // version needed
      view.setUint16(at + 2, 0x0800, true) // names are UTF-8
      view.setUint16(at + 4, 0, true) // stored
      view.setUint16(at + 6, time, true)
      view.setUint16(at + 8, date, true)
      view.setUint32(at + 10, crc, true)
      view.setUint32(at + 14, data.length, true)
      view.setUint32(at + 18, data.length, true)
      view.setUint16(at + 22, name.length, true)
    }
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    common(local, 4)
    parts.push(new Uint8Array(local.buffer), name, data)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true) // version made by
    common(entry, 6)
    entry.setUint32(42, offset, true) // where the entry starts
    directory.push(new Uint8Array(entry.buffer), name)
    offset += 30 + name.length + data.length
  })

  const dirSize = directory.reduce((n, part) => n + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, dirSize, true)
  end.setUint32(16, offset, true)
  return [...parts, ...directory, new Uint8Array(end.buffer)]
}

/** sheets: [{ name, columns: [{ title, width? }], rows: [[cell, ...]] }] -> an .xlsx Blob */
export function makeXlsx(sheets) {
  const names = sheetNames(sheets)
  const files = [
    {
      path: '[Content_Types].xml',
      text:
        `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        names
          .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
          .join('') +
        '</Types>',
    },
    {
      path: '_rels/.rels',
      text:
        `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      path: 'xl/workbook.xml',
      text:
        `${HEAD}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets>${names.map((name, i) => `<sheet name="${esc(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>` +
        '</workbook>',
    },
    {
      path: 'xl/_rels/workbook.xml.rels',
      text:
        `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        names
          .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
          .join('') +
        `<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        '</Relationships>',
    },
    { path: 'xl/styles.xml', text: STYLES },
    ...sheets.map((sheet, i) => ({ path: `xl/worksheets/sheet${i + 1}.xml`, text: sheetXml(sheet) })),
  ]
  return new Blob(zip(files), { type: XLSX_TYPE })
}

/** Hands a file to the browser to save under `filename`. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
