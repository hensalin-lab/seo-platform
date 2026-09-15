import { useState, useRef, useCallback } from 'react'
import { useGrammarCheck, GrammarInline, GrammarSummaryPanel } from '../shared/harper'
import { runAccuracySelfTest, ruleCountsByCategory } from '../shared/grammar-rules'
import { Edit3, Undo2, Redo2, FileText, Wand2, Loader2, Gauge, BadgeCheck, ShieldCheck } from 'lucide-react'

const SAMPLE_TEXT = `This is an test with teh many gramatical erors. Their is a issue in this sentence.
I have went to the store yesturday and buyed some apples. The team are working on there project.
Youre going to recieve the results soon. It's a awesome oportunity for us.`

const CLEAN_SENTENCES = [
  'The team reviewed the quarterly results and found steady growth across every region.',
  'Effective content strategy requires clear goals, consistent publishing, and a deep understanding of the audience.',
  'Our latest release ships with an improved dashboard and a faster onboarding flow for new users.',
  'Customers value fast support, transparent pricing, and predictable feature roadmaps.',
  'The engineering group met this morning to align on the deployment schedule for next week.',
  'Search intent shapes how we structure headings, body copy, and internal links across the site.',
  'A well written article earns citations because it answers the reader question before the first fold.',
  'We benchmarked the page against the top three competitors to identify content gaps.',
  'The analytics team tracked organic traffic, impressions, and click through rate over the quarter.',
  'Internal linking passes contextual relevance across related pages and strengthens the site architecture.',
  'The marketing calendar accounts for seasonal demand, product launches, and evergreen topics.',
  'Every draft goes through a review pass that checks clarity, accuracy, and tone.',
  'The new keyword cluster targets questions that appear mid funnel and late in the buying journey.',
  'Featured snippets reward concise answers that directly match the query intent.',
  'Our tracking stack records rank movements without sending any content to third party services.',
]

const ERROR_SENTENCES = [
  'He has went to the meeting.',
  'They was waiting for the update.',
  'It was a awesome idea.',
  'The team shared there plans.',
  'I has completed the task.',
  'You will recieve the report shortly.',
  'We shipped the order yesturday.',
  'A minor issue occured on the server.',
  'The team will review teh results tomorrow.',
  'This is a very very long process.',
]

function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildBigDoc(paragraphCount = 1000) {
  const rand = mulberry32(42)
  const paras = []
  for (let i = 0; i < paragraphCount; i += 1) {
    const n = 2 + Math.floor(rand() * 2)
    const sentences = []
    for (let j = 0; j < n; j += 1) {
      sentences.push(CLEAN_SENTENCES[Math.floor(rand() * CLEAN_SENTENCES.length)])
    }
    if ((i + 1) % 4 === 0) {
      const error = ERROR_SENTENCES[Math.floor(rand() * ERROR_SENTENCES.length)]
      const at = 1 + Math.floor(rand() * (sentences.length - 1))
      sentences.splice(at, 0, error)
    }
    paras.push(sentences.join(' '))
  }
  return paras.join('\n\n')
}

const BIG_DOC = buildBigDoc(1000)

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`)

export default function GrammarCheckTest() {
  const [content, setContent] = useState(SAMPLE_TEXT)
  const [lastFix, setLastFix] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [runningEval, setRunningEval] = useState(false)
  const textareaRef = useRef(null)

  const { lints, loading, totalCount, categoryCounts, writingScore, applyFix, ignoreAll, addToDictionary, canUndo, canRedo, undo, redo, bulkFix } = useGrammarCheck(content, { debounceMs: 200 })

  const handleApplyFix = useCallback((text, lint, idx) => {
    const newText = applyFix(text, lint, idx)
    if (newText !== text) setContent(newText)
    return newText
  }, [applyFix])

  const handleUndo = useCallback(() => {
    const prev = undo()
    if (prev !== undefined) setContent(prev)
  }, [undo])

  const handleRedo = useCallback(() => {
    const next = redo()
    if (next !== undefined) setContent(next)
  }, [redo])

  const handleIgnoreAll = useCallback((lint) => {
    ignoreAll(lint)
  }, [ignoreAll])

  const handleAddToDictionary = useCallback((word) => {
    addToDictionary(word)
  }, [addToDictionary])

  const handleBulkFix = useCallback(async () => {
    if (!totalCount || loading) return
    setLastFix(null)
    const res = await bulkFix(content)
    if (res) {
      if (res.text !== content) setContent(res.text)
      setLastFix(res)
    }
  }, [bulkFix, content, totalCount, loading])

  const isBigDoc = content === BIG_DOC

  const handleRunEval = useCallback(async () => {
    if (runningEval) return
    setRunningEval(true)
    setAccuracy(null)
    try {
      const res = await runAccuracySelfTest({ limit: 60 })
      setAccuracy(res)
    } catch (err) {
      setAccuracy({ error: err.message })
    } finally {
      setRunningEval(false)
    }
  }, [runningEval])

  return (
    <div style={{ padding: '24px 24px 40px', background: '#F4F6FB', minHeight: '100vh', color: '#0F172A' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Edit3 size={24} style={{ color: '#6366F1' }} />
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Harper Grammar Checker — Live Test</h1>
      </div>

      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16, maxWidth: 760 }}>
        This page is <strong>not</strong> behind auth so you can verify immediately. Everything runs offline in a Web
        Worker via WASM — check the Network tab to confirm <strong>zero external requests</strong>. Type in the box,
        click any underlined word to see the suggestion, or load the <strong>1000-paragraph</strong> stress doc and hit{' '}
        <strong>Fix all errors</strong> to batch-correct.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, minHeight: 400 }}>
        <div>
          <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Content ({isBigDoc ? '1000-paragraph stress test' : 'sample misuse text'})
          </label>
          <div style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or write your content here…"
              style={{
                width: '100%', minHeight: 300, padding: 14, background: '#FFFFFF',
                border: '1px solid #DAE0EA', borderRadius: 8, color: '#0F172A',
                fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                lineHeight: 1.6, boxSizing: 'border-box',
              }}
            />
            <GrammarInline
              text={content}
              lints={lints}
              loading={loading}
              onApplyFix={handleApplyFix}
              onIgnoreAll={handleIgnoreAll}
              onAddToDictionary={handleAddToDictionary}
              textareaRef={textareaRef}
            />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: '#8B93A7', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span>{countWords(content).toLocaleString()} words</span>
            <span>{content.length.toLocaleString()} chars</span>
            {isBigDoc && <span>1,000 paragraphs</span>}
            {loading && <span style={{ color: '#6366F1', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Linting…</span>}
          </div>

          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setLastFix(null); setContent(SAMPLE_TEXT) }}
              style={{ padding: '8px 14px', border: '1px solid #DAE0EA', borderRadius: 8, background: '#FFFFFF', color: '#0F172A', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <FileText size={14} /> Reset sample text
            </button>
            <button
              onClick={() => { setLastFix(null); setContent(BIG_DOC) }}
              style={{ padding: '8px 14px', border: '1px solid #6366F1', borderRadius: 8, background: '#EEF0FF', color: '#4F46E5', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <FileText size={14} /> Load 1,000-paragraph test doc
            </button>
            <button
              onClick={handleBulkFix}
              disabled={!totalCount || loading}
              style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: '#6366F1', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: totalCount && !loading ? 'pointer' : 'not-allowed', opacity: totalCount && !loading ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Wand2 size={14} /> Fix all errors
            </button>
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              style={{ padding: '8px 12px', border: '1px solid #DAE0EA', borderRadius: 8, background: '#FFFFFF', color: canUndo ? '#0F172A' : '#CBD2E0', fontSize: 13, cursor: canUndo ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Undo2 size={14} /> Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              style={{ padding: '8px 12px', border: '1px solid #DAE0EA', borderRadius: 8, background: '#FFFFFF', color: canRedo ? '#0F172A' : '#CBD2E0', fontSize: 13, cursor: canRedo ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Redo2 size={14} /> Redo
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('harper.customWords')
                localStorage.removeItem('harper.ignoredLints')
                window.location.reload()
              }}
              title="Clears saved custom words and ignored-lint overrides, then reloads"
              style={{ padding: '8px 12px', border: '1px solid #DAE0EA', borderRadius: 8, background: '#FFFFFF', color: '#64748B', fontSize: 13, cursor: 'pointer' }}
            >
              Reset saved overrides
            </button>
          </div>

          {lastFix && totalCount === 0 && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, fontSize: 12, color: '#047857' }}>
              Fixed {lastFix.applied.toLocaleString()} issues in one pass. The underlines are gone — linting is re-running to confirm.
            </div>
          )}
          {lastFix && totalCount > 0 && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12, color: '#92400E' }}>
              Applied {lastFix.applied.toLocaleString()} fixes; {totalCount.toLocaleString()} issue(s) remain (some lints offer no auto-correct).
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <GrammarSummaryPanel totalCount={totalCount} categoryCounts={categoryCounts} loading={loading} writingScore={writingScore} />
        </div>
      </div>

      <div style={{ marginTop: 20, background: '#FFFFFF', border: '1px solid #DAE0EA', borderRadius: 10, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Gauge size={18} style={{ color: '#6366F1' }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Accuracy self-test</h2>
          <span style={{ fontSize: 11, color: '#8B93A7' }}>measures the full pipeline (Harper + 100 rule-based corrections) end-to-end in the browser</span>
        </div>

        <button
          onClick={handleRunEval}
          disabled={runningEval}
          style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: '#0F172A', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: runningEval ? 'not-allowed' : 'pointer', opacity: runningEval ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {runningEval ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <BadgeCheck size={14} />}
          {runningEval ? 'Running self-test…' : 'Run accuracy self-test'}
        </button>

        {accuracy && accuracy.error && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#B91C1C' }}>
            Self-test failed: {accuracy.error}
          </div>
        )}

        {accuracy && !accuracy.error && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px', border: '1px solid #EEF2F7' }}>
                <div style={{ fontSize: 11, color: '#64748B' }}>Precision</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{pct(accuracy.precision)}</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>{accuracy.correctFixes}/{accuracy.fixesApplied} fixes correct</div>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px', border: '1px solid #EEF2F7' }}>
                <div style={{ fontSize: 11, color: '#64748B' }}>Recall</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{pct(accuracy.recall)}</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>{accuracy.correctFixes}/{accuracy.errors} errors caught</div>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px', border: '1px solid #EEF2F7' }}>
                <div style={{ fontSize: 11, color: '#64748B' }}>F1</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#6366F1', marginTop: 2 }}>{pct(accuracy.f1)}</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>harmonic mean</div>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px', border: '1px solid #EEF2F7' }}>
                <div style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={12} style={{ color: '#10B981' }} /> Clean text preserved</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{pct(accuracy.noopPreserve)}</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>{accuracy.noops - accuracy.harmed}/{accuracy.noops} untouched</div>
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: '#475569', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span>{accuracy.missed} errors missed</span>
              <span>{accuracy.harmed} clean examples wrongly changed</span>
              <span>
                by category:{' '}
                {Object.entries(ruleCountsByCategory())
                  .map(([k, v]) => `${k} ×${v}`)
                  .join(' · ')}
              </span>
            </div>

            {accuracy.sample.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 12 }}>
                {accuracy.sample.map((s) => (
                  <div key={s.id} style={{ padding: '6px 0', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ color: s.correct ? '#10B981' : '#EF4444', fontWeight: 700, minWidth: 14 }}>{s.correct ? '✓' : '✗'}</span>
                    <div style={{ flex: 1, color: '#334155' }}>
                      <span style={{ textDecoration: 'line-through', color: '#94A3B8' }}>{s.input}</span>
                      <span style={{ margin: '0 6px', color: '#CBD5E1' }}>→</span>
                      <span>{s.result}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}