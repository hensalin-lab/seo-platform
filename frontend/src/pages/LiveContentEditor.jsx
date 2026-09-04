import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'
import { Edit3, Target, BarChart2, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react'

function ScoreBar({ score, max = 100, color = '#6366F1' }) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100))
  return (
    <div style={{ background: '#1F2937', borderRadius: 4, height: 8, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', background: color, borderRadius: 4,
        transition: 'width 0.3s ease',
      }} />
    </div>
  )
}

export default function LiveContentEditor() {
  const [keyword, setKeyword] = useState('')
  const [content, setContent] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const timerRef = useRef(null)

  const doScore = useCallback(async (kw, txt) => {
    if (!kw.trim() || !txt.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`${window.location.origin}/api/content-editor/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ content: txt, target_keyword: kw }),
      })
      if (!res.ok) throw new Error(`Score failed (${res.status})`)
      const data = await res.json()
      setResult(data)
    } catch (e) { setError(e.message || 'Scoring failed') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (keyword.trim() && content.trim().length > 20) {
      timerRef.current = setTimeout(() => doScore(keyword, content), 2000)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [content, keyword, doScore])

  const draft = result?.draft
  const avg = result?.competitor_average
  const gaps = result?.gaps
  const competitors = result?.competitors || []

  return (
    <div style={{ padding: '24px 24px 40px', background: '#080B18', minHeight: '100vh', color: '#E5E7EB' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Edit3 size={24} style={{ color: '#6366F1' }} />
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Live Content Editor</h1>
      </div>

      {/* Keyword input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, display: 'block', marginBottom: 6 }}>Target Keyword</label>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="e.g. best project management tools"
          style={{
            width: '100%', maxWidth: 500, padding: '9px 12px', background: '#111827',
            border: '1px solid #374151', borderRadius: 8, color: '#F9FAFB', fontSize: 14,
            outline: 'none',
          }}
        />
      </div>

      {/* Two-pane layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, minHeight: 400 }}>
        {/* Left: editor */}
        <div>
          <label style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, display: 'block', marginBottom: 6 }}>Your Draft (HTML or plain text)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste or write your content here…"
            style={{
              width: '100%', minHeight: 400, padding: 14, background: '#111827',
              border: '1px solid #1F2937', borderRadius: 8, color: '#F9FAFB',
              fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
              lineHeight: 1.6, boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: 6, fontSize: 11, color: '#4B5563' }}>
            {content.trim().split(/\s+/).filter(Boolean).length} words
            {loading && <span style={{ marginLeft: 8, color: '#6366F1' }}><Loader2 size={11} style={{ animation: 'spin 1s linear infinite', verticalAlign: 'middle' }} /> Scoring…</span>}
          </div>
        </div>

        {/* Right: score panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Draft score */}
          <div style={{
            background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: 16,
          }}>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Your Draft</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: draft?.score >= 60 ? '#22C55E' : draft?.score >= 40 ? '#F59E0B' : '#EF4444' }}>
                {draft?.score ?? '—'}
              </span>
              <span style={{ fontSize: 13, color: '#6B7280' }}>/100</span>
            </div>
            <ScoreBar score={draft?.score || 0} color={draft?.score >= 60 ? '#22C55E' : draft?.score >= 40 ? '#F59E0B' : '#EF4444'} />
            <div style={{ marginTop: 10, fontSize: 12, color: '#9CA3AF' }}>
              {draft?.word_count?.toLocaleString() || 0} words · {draft?.heading_count || 0} headings · {draft?.entity_count || 0} entities
            </div>
          </div>

          {/* Competitor average */}
          <div style={{
            background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: 16,
          }}>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Competitor Average</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: '#F59E0B' }}>
                {avg?.score ?? '—'}
              </span>
              <span style={{ fontSize: 13, color: '#6B7280' }}>/100</span>
            </div>
            <ScoreBar score={avg?.score || 0} color="#F59E0B" />
            <div style={{ marginTop: 10, fontSize: 12, color: '#9CA3AF' }}>
              {avg?.word_count?.toLocaleString() || 0} avg words
            </div>
          </div>

          {/* Gaps */}
          {gaps && (
            <div style={{
              background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: 16,
            }}>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>Gaps vs Top 3</div>

              {/* Word count gap */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#9CA3AF' }}>Word count gap</span>
                  <span style={{ fontWeight: 600, color: (gaps.word_count_vs_competitors || 0) > 0 ? '#EF4444' : '#22C55E' }}>
                    {gaps.word_count_vs_competitors > 0 ? '+' : ''}{gaps.word_count_vs_competitors || 0}
                  </span>
                </div>
              </div>

              {/* Missing headings */}
              {gaps.missing_headings?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>Missing Headings</div>
                  {gaps.missing_headings.slice(0, 5).map((h, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#F59E0B', padding: '2px 0' }}>+ {h}</div>
                  ))}
                </div>
              )}

              {/* Missing entities */}
              {gaps.missing_entities?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>Missing Key Terms</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {gaps.missing_entities.slice(0, 10).map((e, i) => (
                      <span key={i} style={{
                        padding: '2px 6px', background: '#F59E0B10', color: '#FBBF24',
                        borderRadius: 3, fontSize: 10, fontWeight: 500,
                      }}>
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Score gap */}
              <div style={{ marginTop: 10, padding: '8px 10px', background: '#1F2937', borderRadius: 6, fontSize: 12 }}>
                <span style={{ color: '#6B7280' }}>Score gap: </span>
                <span style={{
                  fontWeight: 700,
                  color: (gaps.score_gap || 0) > 0 ? '#EF4444' : '#22C55E',
                }}>
                  {(gaps.score_gap || 0) > 0 ? '+' : ''}{gaps.score_gap || 0}
                </span>
              </div>
            </div>
          )}

          {/* Competitor pages */}
          {competitors.length > 0 && (
            <div style={{
              background: '#111827', border: '1px solid #1F2937', borderRadius: 8, padding: 16,
            }}>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>Top 3 Pages</div>
              {competitors.map((c, i) => (
                <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < competitors.length - 1 ? '1px solid #1F2937' : 'none' }}>
                  <div style={{ fontSize: 11, color: '#6366F1', wordBreak: 'break-all', marginBottom: 2 }}>{c.url}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#9CA3AF' }}>
                    <span style={{ fontWeight: 600, color: '#E5E7EB' }}>{c.score}/100</span>
                    <span>{c.word_count} words</span>
                    <span>{c.heading_count} headings</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{ padding: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', fontSize: 12 }}>
              {error}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
