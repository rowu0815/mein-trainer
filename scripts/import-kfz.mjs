import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://nbczyrivqghwlryuaqlh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iY3p5cml2cWdod2xyeXVhcWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzcwODUsImV4cCI6MjA4ODQ1MzA4NX0.Y5sry3Mb8wTNNnR6pP2J_eRfhvqj9rnUgQWqoStKUAo'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Excel einlesen ────────────────────────────────────────────────────────────
const filePath = resolve(__dirname, '..', 'kfz_master.csv.xlsx')
const workbook = XLSX.readFile(filePath)
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet)

console.log(`📄 ${rows.length} Zeilen in der Excel-Datei gefunden.`)
console.log('Erste Zeile (Spaltencheck):', rows[0])

// ── Mapping & Bereinigung ─────────────────────────────────────────────────────
const records = rows
  .map((row) => {
    const code     = String(row['Kfz-Kennzeichen'] ?? '').trim()
    const notizen  = String(row['Notizen']         ?? '').trim()
    const name     = String(row['Name']            ?? '').trim()
    const state    = String(row['Land']            ?? '').trim()

    // 'Notizen' enthält die Stadt, ist aber oft leer → dann 'Name' als Fallback
    const city     = notizen || name
    const district = name

    return { code, city, district, state }
  })
  .filter(r => r.code && r.city) // leere Zeilen überspringen

console.log(`✅ ${records.length} gültige Kennzeichen vorbereitet.`)

// ── Upsert in Batches ─────────────────────────────────────────────────────────
const BATCH_SIZE = 50
let inserted = 0
let errors = 0

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE)

  const { error } = await supabase
    .from('license_plates')
    .upsert(batch, {
      onConflict: 'code',
      ignoreDuplicates: false, // update bei Konflikt
    })

  if (error) {
    console.error(`❌ Fehler bei Batch ${i}–${i + batch.length}:`, error.message)
    errors += batch.length
  } else {
    inserted += batch.length
    process.stdout.write(`\r⬆️  ${inserted}/${records.length} hochgeladen...`)
  }
}

console.log(`\n\n🎉 Fertig! ${inserted} Kennzeichen importiert, ${errors} Fehler.`)
