'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, LicensePlate } from '@/lib/supabase'

// ── Spaced repetition config ──────────────────────────────────────────────────

const LEVEL_DAYS: Record<number, number> = { 1:1, 2:3, 3:7, 4:14, 5:30 }

function addDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Neu', 2: 'Anfänger', 3: 'Lernend',
  4: 'Fortgeschritten', 5: 'Gut', 6: 'Weiß ich',
}


// ── EU-Sternenkranz ───────────────────────────────────────────────────────────

function EuStars({ size }: { size: number }) {
  const cx = size / 2
  const cy = size * 0.48
  const r  = size * 0.34
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        return (
          <text
            key={i}
            x={cx + r * Math.cos(a)}
            y={cy + r * Math.sin(a)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.19}
            fill="#FFD700"
          >★</text>
        )
      })}
    </svg>
  )
}

// ── Kennzeichen-Karte ─────────────────────────────────────────────────────────

function PlateCard({ code, mini = false }: { code: string; mini?: boolean }) {
  const border   = mini ? 3  : 5
  const euW      = mini ? 'w-7' : 'w-10'
  const euSize   = mini ? 14 : 20
  const dSize    = mini ? 'text-[6px]' : 'text-[9px]'
  const codeSize = mini ? 'text-base'  : 'text-5xl'

  return (
    <div
      className={`bg-slate-50 rounded-lg flex items-stretch w-full select-none ${mini ? '' : 'shadow-2xl'}`}
      style={{
        border:      `${border}px solid #111`,
        aspectRatio: '4.8',
        boxShadow:   `inset 0 0 0 ${mini ? 1 : 2}px rgba(0,0,0,0.18), ${mini ? '0 2px 8px' : '0 12px 32px'} rgba(0,0,0,0.28)`,
      }}
    >
      {/* EU-Feld */}
      <div className={`bg-blue-700 flex flex-col items-center justify-center ${euW} flex-shrink-0 gap-0 rounded-l-[3px]`}>
        <EuStars size={euSize} />
        <span className={`text-white font-black leading-none tracking-widest ${dSize}`}>D</span>
      </div>

      {/* Trennlinie */}
      <div className="w-px bg-black/25 flex-shrink-0" />

      {/* Kennzeichen-Text — linksbündig, nah am EU-Feld */}
      <div className="flex-1 flex items-center pl-3 pr-2 overflow-hidden">
        <span
          className={`font-black ${codeSize} text-black tracking-wide whitespace-nowrap flex items-center`}
          style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
        >
          {code}<span className="mx-1">-</span>RW 123
        </span>
      </div>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PreviousCard = {
  code: string
  level: number
  next_review: string | null
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export default function Home() {
  const [card, setCard]               = useState<LicensePlate | null>(null)
  const [flipped, setFlipped]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const [done, setDone]               = useState(false)
  const [resetting, setResetting]     = useState(false)
  const [filterLevel, setFilterLevel] = useState<number | null>(null)
  const [filterState, setFilterState] = useState<string | null>(null)
  const [states, setStates]           = useState<string[]>([])
  const [levelCounts, setLevelCounts] = useState<Record<number, number>>({1:0,2:0,3:0,4:0,5:0,6:0})
  const [previousCard, setPreviousCard] = useState<PreviousCard | null>(null)

  const handlersRef = useRef({
    flipped:          false,
    loading:          true,
    done:             false,
    card:             null as LicensePlate | null,
    previousCard:     null as PreviousCard | null,
    handleKnown:      async () => {},
    handleUnknown:    async () => {},
    handleMasterKnown:async () => {},
    handleUndo:       async () => {},
  })

  // ── Data fetchers ───────────────────────────────────────────────────────────

  const fetchStates = useCallback(async () => {
    const { data } = await supabase.from('license_plates').select('state')
    if (!data) return
    const unique = Array.from(new Set(data.map(r => r.state).filter(Boolean))).sort()
    setStates(unique)
  }, [])

  const fetchLevelCounts = useCallback(async (stateFilter: string | null) => {
    let q = supabase.from('license_plates').select('level')
    if (stateFilter) q = q.eq('state', stateFilter)
    const { data } = await q
    if (!data) return
    const counts: Record<number, number> = {1:0,2:0,3:0,4:0,5:0,6:0}
    data.forEach(row => {
      const lvl = row.level ?? 0
      if (lvl >= 1 && lvl <= 6) counts[lvl] = (counts[lvl] || 0) + 1
    })
    setLevelCounts(counts)
  }, [])

  const fetchNextCard = useCallback(async (
    excludeCode?: string,
    lvlFilter?:   number | null,
    stateFilter?: string | null,
  ) => {
    setLoading(true)
    setFlipped(false)
    let next: LicensePlate | null = null

    if (lvlFilter !== null && lvlFilter !== undefined) {
      let q = supabase.from('license_plates').select('*')
        .eq('level', lvlFilter)
        .order('next_review', { ascending: true, nullsFirst: true })
        .limit(1)
      if (excludeCode) q = q.neq('code', excludeCode)
      if (stateFilter) q = q.eq('state', stateFilter)
      const { data } = await q.maybeSingle()
      next = data as LicensePlate | null
    } else {
      const now = new Date().toISOString()

      let q1 = supabase.from('license_plates').select('*')
        .is('next_review', null).lt('level', 6)
        .order('level', { ascending: true }).limit(1)
      if (excludeCode) q1 = q1.neq('code', excludeCode)
      if (stateFilter) q1 = q1.eq('state', stateFilter)
      const { data: newCard } = await q1.maybeSingle()

      let q2 = supabase.from('license_plates').select('*')
        .lte('next_review', now).lt('level', 6)
        .order('level', { ascending: true }).order('next_review', { ascending: true }).limit(1)
      if (excludeCode) q2 = q2.neq('code', excludeCode)
      if (stateFilter) q2 = q2.eq('state', stateFilter)
      const { data: dueCard } = await q2.maybeSingle()

      if (newCard && dueCard) {
        next = (newCard.level ?? 0) <= (dueCard.level ?? 0) ? newCard : dueCard
      } else {
        next = (newCard || dueCard) as LicensePlate | null
      }
    }

    if (next) { setCard(next); setDone(false) }
    else       { setCard(null); setDone(true)  }
    setLoading(false)
  }, [])

  useEffect(() => { fetchStates() }, [fetchStates])
  useEffect(() => {
    fetchNextCard(undefined, filterLevel, filterState)
    fetchLevelCounts(filterState)
  }, [filterLevel, filterState, fetchNextCard, fetchLevelCounts])

  // ── Actions ─────────────────────────────────────────────────────────────────

  const resetDaily = async () => {
    setResetting(true)
    let q = supabase.from('license_plates').update({ next_review: null }).lt('level', 6)
    if (filterState) q = q.eq('state', filterState)
    await q
    setResetting(false)
    setPreviousCard(null)
    fetchNextCard(undefined, filterLevel, filterState)
  }

  const handleKnown = useCallback(async () => {
    if (!card || !flipped) return
    setPreviousCard({ code: card.code, level: card.level ?? 0, next_review: card.next_review })
    const newLevel = Math.min((card.level ?? 0) + 1, 5)
    await supabase.from('license_plates')
      .update({ level: newLevel, next_review: addDays(LEVEL_DAYS[newLevel]) })
      .eq('code', card.code)
    fetchLevelCounts(filterState)
    fetchNextCard(card.code, filterLevel, filterState)
  }, [card, flipped, filterLevel, filterState, fetchLevelCounts, fetchNextCard])

  const handleUnknown = useCallback(async () => {
    if (!card || !flipped) return
    setPreviousCard({ code: card.code, level: card.level ?? 0, next_review: card.next_review })
    await supabase.from('license_plates')
      .update({ level: 1, next_review: new Date().toISOString() })
      .eq('code', card.code)
    fetchLevelCounts(filterState)
    fetchNextCard(card.code, filterLevel, filterState)
  }, [card, flipped, filterLevel, filterState, fetchLevelCounts, fetchNextCard])

  const handleMasterKnown = useCallback(async () => {
    if (!card || !flipped) return
    setPreviousCard({ code: card.code, level: card.level ?? 0, next_review: card.next_review })
    await supabase.from('license_plates')
      .update({ level: 6, next_review: '2099-01-01T00:00:00.000Z' })
      .eq('code', card.code)
    fetchLevelCounts(filterState)
    fetchNextCard(card.code, filterLevel, filterState)
  }, [card, flipped, filterLevel, filterState, fetchLevelCounts, fetchNextCard])

  const handleUndo = useCallback(async () => {
    if (!previousCard) return
    await supabase.from('license_plates')
      .update({ level: previousCard.level, next_review: previousCard.next_review })
      .eq('code', previousCard.code)
    const { data } = await supabase.from('license_plates').select('*')
      .eq('code', previousCard.code).maybeSingle()
    if (data) { setCard(data as LicensePlate); setFlipped(false); setDone(false) }
    setPreviousCard(null)
    fetchLevelCounts(filterState)
  }, [previousCard, filterState, fetchLevelCounts])

  // Keep ref in sync for keyboard handler
  useEffect(() => {
    handlersRef.current = {
      flipped, loading, done, card, previousCard,
      handleKnown, handleUnknown, handleMasterKnown, handleUndo,
    }
  })

  // Keyboard shortcuts (registered once, reads from ref)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return
      const h = handlersRef.current
      if      (e.key === 'Enter')     { if (!h.loading && h.card) setFlipped(f => !f) }
      else if (e.key === '1')         { if (h.flipped && !h.loading) h.handleUnknown() }
      else if (e.key === '2')         { if (h.flipped && !h.loading) h.handleKnown() }
      else if (e.key === '3')         { if (h.flipped && !h.loading) h.handleMasterKnown() }
      else if (e.key === 'Backspace') { e.preventDefault(); if (!h.loading && h.previousCard) h.handleUndo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Done screen ──────────────────────────────────────────────────────────────

  if (done || !card) {
    const groupLabel = filterLevel !== null ? `Gruppe ${filterLevel}` : 'heute'
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Alle für {groupLabel} gelernt!</h1>
        <p className="text-gray-500 mb-8">
          {filterLevel !== null
            ? `Keine Karten mehr in Gruppe ${filterLevel}.`
            : 'Keine fälligen Karten mehr. Super gemacht!'}
        </p>
        {filterLevel === null && (
          <button onClick={resetDaily} disabled={resetting}
            className="w-full max-w-xs py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-50 mb-3"
          >
            {resetting ? 'Wird zurückgesetzt…' : 'Nochmal von vorne'}
          </button>
        )}
        <button onClick={() => fetchNextCard(undefined, filterLevel, filterState)}
          className="w-full max-w-xs py-4 bg-gray-200 text-gray-700 rounded-2xl font-semibold text-lg active:scale-95 transition-transform"
        >
          Neu laden
        </button>
        <div className="w-full max-w-xs mt-6">
          <select value={filterState ?? ''} onChange={e => setFilterState(e.target.value || null)}
            className="w-full px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium border-0 outline-none"
          >
            <option value="">Alle Bundesländer</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap justify-center">
          <button onClick={() => setFilterLevel(null)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filterLevel === null ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
          >Alle</button>
          {[1,2,3,4,5,6].map(lvl => (
            <button key={lvl} onClick={() => setFilterLevel(lvl)}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${filterLevel === lvl ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
            >{lvl}</button>
          ))}
        </div>
      </div>
    )
  }

  // ── Main screen ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Header */}
      <header className="px-6 pt-10 pb-2 flex items-center justify-between max-w-sm mx-auto w-full">
        <h1 className="text-lg font-semibold text-gray-400 tracking-widest uppercase">
          Kfz-Kennzeichen Trainer
        </h1>
        <div className="flex items-center gap-3">
          {previousCard && (
            <button onClick={handleUndo} className="text-xs text-orange-400 underline active:opacity-50">
              ↩ Undo <span className="opacity-60">[⌫]</span>
            </button>
          )}
          <button onClick={resetDaily} disabled={resetting} className="text-xs text-gray-400 underline active:opacity-50">
            Reset
          </button>
        </div>
      </header>

      {/* Bundesland-Dropdown */}
      <div className="px-6 pb-3 max-w-sm mx-auto w-full">
        <select
          value={filterState ?? ''}
          onChange={e => setFilterState(e.target.value || null)}
          className="w-full px-4 py-2 rounded-xl bg-white text-gray-700 text-sm font-medium shadow-sm border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"
        >
          <option value="">Alle Bundesländer</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Level badge */}
      <div className="flex justify-center pb-2">
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          Stufe {card.level ?? 0} · {LEVEL_LABELS[card.level ?? 1]}
        </span>
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {!flipped ? (
            /* ── Front: das Kennzeichen ── */
            <button
              onClick={() => setFlipped(true)}
              className="w-full active:scale-95 transition-transform"
              aria-label="Karte umdrehen"
            >
              <PlateCard code={card.code} />
              <p className="text-center mt-4 text-sm text-gray-400">
                Tippen ·{' '}
                <kbd className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">↵</kbd>
                {' '}zum Aufdecken
              </p>
            </button>
          ) : (
            /* ── Back: Mini-Kennzeichen + Auflösung ── */
            <button
              onClick={() => setFlipped(false)}
              className="w-full active:scale-[0.98] transition-transform"
              aria-label="Karte zurückdrehen"
            >
              {/* Mini plate as reference */}
              <div className="w-3/5 mx-auto mb-5">
                <PlateCard code={card.code} mini />
              </div>

              {/* Resolution card */}
              <div className="bg-white rounded-3xl shadow-xl px-8 py-7 flex flex-col items-center text-center">
                <span className="text-3xl font-bold text-gray-900 leading-tight">{card.city}</span>
                {card.district && card.district !== card.city && (
                  <span className="text-lg text-gray-500 mt-1">{card.district}</span>
                )}
                <span className="text-sm text-blue-400 font-medium mt-2">{card.state}</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Level indicator dots */}
      <div className="flex justify-center gap-1.5 py-3">
        {[1,2,3,4,5,6].map(lvl => (
          <div key={lvl} className={`w-3 h-3 rounded-full transition-colors ${
            lvl <= (card.level ?? 0)
              ? lvl === 6 ? 'bg-yellow-400' : 'bg-blue-500'
              : 'bg-gray-200'
          }`} />
        ))}
      </div>

      {/* Haupt-Buttons — sticky am unteren Rand für Daumen-Erreichbarkeit */}
      <div className="sticky bottom-0 z-10 bg-gray-50 px-6 pt-2 pb-2 grid grid-cols-3 gap-2 max-w-sm mx-auto w-full">
        <button onClick={handleUnknown}
          className={`h-20 rounded-2xl bg-red-600 text-white font-black text-sm active:scale-95 transition-all flex items-center justify-center ${!flipped ? 'opacity-80' : 'opacity-100'}`}
        >Nicht gekonnt [1]</button>
        <button onClick={handleKnown}
          className={`h-20 rounded-2xl bg-green-500 text-white font-black text-sm active:scale-95 transition-all flex items-center justify-center ${!flipped ? 'opacity-80' : 'opacity-100'}`}
        >Gekonnt [2]</button>
        <button onClick={handleMasterKnown}
          className={`h-20 rounded-2xl bg-emerald-800 text-white font-black text-sm active:scale-95 transition-all flex items-center justify-center ${!flipped ? 'opacity-80' : 'opacity-100'}`}
        >Weiß ich [3]</button>
      </div>

      {/* Undo-Button */}
      <div className="px-6 pb-1 max-w-sm mx-auto w-full">
        <button onClick={handleUndo} disabled={!previousCard}
          className="w-full py-2 rounded-xl bg-gray-100 text-gray-400 text-xs font-medium active:scale-95 transition-all disabled:opacity-0 disabled:pointer-events-none"
        >
          ↩ Rückgängig <kbd className="font-mono">[⌫]</kbd>
        </button>
      </div>

      {/* Gruppen-Filter + Counter */}
      <div className="px-6 pb-10 max-w-sm mx-auto w-full">
        <p className="text-xs text-gray-400 text-center mb-2">Nur diese Gruppe lernen:</p>
        <div className="flex gap-2 justify-between">
          <button onClick={() => setFilterLevel(null)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${filterLevel === null ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
          >Alle</button>
          {[1,2,3,4,5,6].map(lvl => (
            <button key={lvl} onClick={() => setFilterLevel(lvl === filterLevel ? null : lvl)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                filterLevel === lvl
                  ? lvl === 6 ? 'bg-yellow-400 text-white' : 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >{lvl}</button>
          ))}
        </div>
        <div className="flex gap-2 justify-between mt-1">
          <div className="flex-1 text-center text-xs text-gray-400">
            {Object.values(levelCounts).reduce((a, b) => a + b, 0)}
          </div>
          {[1,2,3,4,5,6].map(lvl => (
            <div key={lvl} className="flex-1 text-center text-xs text-gray-400">
              {levelCounts[lvl] ?? 0}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
