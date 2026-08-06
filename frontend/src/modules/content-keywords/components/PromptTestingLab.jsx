import { useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedAction from '../../../components/ProtectedAction';
import { api } from '../../../api';
import {
  MessageSquare, Send, Save, Clock, History, Sparkles, CheckCircle, XCircle, Brain,
  Loader2, AlertCircle
} from 'lucide-react';

const MODELS = [
  { id: 'chatgpt', label: 'ChatGPT', icon: MessageSquare, color: '#10b981', borderColor: '#10b981', bgColor: 'rgba(16,185,129,0.12)' },
  { id: 'perplexity', label: 'Perplexity', icon: Sparkles, color: '#f97316', borderColor: '#f97316', bgColor: 'rgba(249,115,22,0.12)' },
  { id: 'claude', label: 'Claude', icon: Brain, color: '#8b5cf6', borderColor: '#8b5cf6', bgColor: 'rgba(139,92,246,0.12)' },
  { id: 'gemini', label: 'Gemini', icon: Brain, color: '#3b82f6', borderColor: '#3b82f6', bgColor: 'rgba(59,130,246,0.12)' },
  { id: 'deepseek', label: 'DeepSeek', icon: Brain, color: '#06b6d4', borderColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.12)' },
];

const SENTIMENT_STYLES = {
  POSITIVE: { label: 'Positive', bg: 'rgba(16,185,129,0.15)', color: '#10b981', icon: CheckCircle },
  NEGATIVE: { label: 'Negative', bg: 'rgba(239,68,68,0.15)', color: '#ef4444', icon: XCircle },
  NEUTRAL: { label: 'Neutral', bg: 'rgba(148,163,184,0.15)', color: 'var(--text-muted)', icon: AlertCircle },
};

function inferSentiment(text) {
  const t = (text || '').toLowerCase();
  const positive = ['recommend', 'best', 'excellent', 'great', 'good', 'worth', 'strong', 'highly'];
  const negative = ['not recommend', 'poor', 'avoid', 'worst', 'weak', 'bad', 'unreliable', 'disappoint'];
  let pos = 0, neg = 0;
  positive.forEach(w => { if (t.includes(w)) pos++; });
  negative.forEach(w => { if (t.includes(w)) neg++; });
  if (pos > neg) return 'POSITIVE';
  if (neg > pos) return 'NEGATIVE';
  return 'NEUTRAL';
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PromptTestingLab() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [prompt, setPrompt] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedModels, setSelectedModels] = useState(MODELS.map(m => m.id));
  const [results, setResults] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [runError, setRunError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleModel = useCallback((modelId) => {
    setSelectedModels(prev =>
      prev.includes(modelId) ? prev.filter(m => m !== modelId) : [...prev, modelId]
    );
  }, []);

  const runAll = useCallback(async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;
    setExecuting(true);
    setRunError(null);
    setResults(null);
    try {
      const data = await api.request('/ai/prompt-test', {
        method: 'POST',
        body: JSON.stringify({ prompt, brand: brand.trim(), models: selectedModels }),
      });
      setResults(data.results || {});
    } catch (e) {
      setRunError(e.message);
    } finally {
      setExecuting(false);
    }
  }, [prompt, brand, selectedModels]);

  const saveTest = useCallback(() => {
    if (!results) return;
    setSaving(true);
    setTimeout(() => {
      const entry = {
        id: Date.now(),
        prompt: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : ''),
        date: new Date(),
        modelCount: Object.keys(results).length,
        hadMentions: Object.values(results).some(r => r.brand_mentioned),
        fullResults: results,
      };
      setHistory(prev => [entry, ...prev]);
      setSaving(false);
    }, 300);
  }, [results, prompt]);

  const promptCharCount = prompt.length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>AI Prompt Testing Lab</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Run the same prompt across multiple LLMs to evaluate brand mention performance</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <MessageSquare size={16} color="#3b82f6" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Prompt</span>
        </div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Enter a prompt to test across LLMs..."
          rows={4}
          style={{
            width: '100%', padding: '12px 14px', background: '#12141a', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
            lineHeight: 1.6, outline: 'none',
          }}
          onFocus={e => { e.target.style.borderColor = '#3b82f6'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: promptCharCount > 500 ? '#ef4444' : '#6b7280' }}>
            {promptCharCount} characters
          </span>
          <ProtectedAction requiredRole="VIEWER">
            <button
              onClick={runAll}
              disabled={!prompt.trim() || selectedModels.length === 0 || executing}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: executing ? 'wait' : 'pointer',
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                color: '#fff', opacity: (!prompt.trim() || selectedModels.length === 0) && !executing ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              {executing ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={15} />}
              {executing ? 'Running...' : 'Run on All Models'}
            </button>
          </ProtectedAction>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Brand to check (optional)</span>
          <input
            value={brand}
            onChange={e => setBrand(e.target.value)}
            placeholder="e.g. Datavicloud"
            style={{
              flex: 1, padding: '8px 12px', background: '#12141a', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none', maxWidth: 300,
            }}
          />
          <span style={{ fontSize: 11, color: '#6b7280' }}>Each model's answer is checked for this name.</span>
        </div>
      </div>

      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Models</span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{selectedModels.length}/{MODELS.length} selected</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MODELS.map(model => {
            const active = selectedModels.includes(model.id);
            return (
              <button
                key={model.id}
                onClick={() => toggleModel(model.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', border: `1px solid ${active ? model.borderColor : 'var(--border)'}`,
                  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: active ? model.bgColor : 'transparent',
                  color: active ? model.color : 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}
              >
                <model.icon size={14} />
                {model.label}
                {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: model.color }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color="#3b82f6" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Results</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {results && (
              <button
                onClick={saveTest}
                disabled={saving}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: 'transparent', color: 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                <Save size={13} /> {saving ? 'Saving...' : 'Save Test'}
              </button>
            )}
          </div>
        </div>

        {!results && !executing && !runError && (
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
            <Sparkles size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>No results yet</div>
            <div style={{ fontSize: 13, color: '#4b5563' }}>Enter a prompt and run against the selected models to see results here.</div>
          </div>
        )}

        {runError && (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '18px 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              <AlertCircle size={15} /> Failed to run prompt test
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{runError}</div>
          </div>
        )}

        {executing && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {MODELS.filter(m => selectedModels.includes(m.id)).map(model => (
              <div key={model.id} style={{
                background: 'var(--bg-white)', border: `1px solid ${model.borderColor}40`, borderRadius: 12, padding: 20,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: model.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <model.icon size={14} color={model.color} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{model.label}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
                  <Loader2 size={28} color={model.color} style={{ animation: 'spin 0.8s linear infinite', marginBottom: 8 }} />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Running...</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {results && !executing && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {MODELS.filter(m => selectedModels.includes(m.id)).map(model => {
              const r = results[model.id];
              const sentiment = SENTIMENT_STYLES[inferSentiment(r?.response_snippet)] || SENTIMENT_STYLES.NEUTRAL;
              const SentimentIcon = sentiment.icon;
              const unavailable = !r?.available;
              return (
                <div key={model.id} style={{
                  background: 'var(--bg-white)', border: `1px solid ${model.borderColor}40`, borderRadius: 12, padding: 20,
                  borderLeft: `3px solid ${model.borderColor}`,
                  opacity: unavailable ? 0.7 : 1,
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: model.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <model.icon size={14} color={model.color} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{model.label}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{r?.provider}</span>
                  </div>

                  {unavailable ? (
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
                      No AI provider answered for this platform. Add a working API key (see AI Provider Status) to enable it.
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12, minHeight: 60 }}>
                      {r?.response_snippet?.slice(0, 200)}{r?.response_snippet?.length > 200 ? '...' : ''}
                    </div>
                  )}

                  {!unavailable && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                        background: r?.brand_mentioned ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.12)',
                        color: r?.brand_mentioned ? '#10b981' : 'var(--text-muted)',
                      }}>
                        {r?.brand_mentioned ? <CheckCircle size={13} /> : <XCircle size={13} />}
                        Brand {r?.brand_mentioned ? 'Mentioned' : 'Not Mentioned'}
                      </div>

                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                        background: sentiment.bg, color: sentiment.color,
                      }}>
                        <SentimentIcon size={13} />
                        {sentiment.label}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 12, color: '#4b5563', fontStyle: 'italic' }}>
          Live responses from configured AI providers. Brand mention is checked against the response text; sentiment is inferred from wording.
        </div>
      </div>

      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text)', fontSize: 14, fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={16} color="#3b82f6" />
            <span>Test History</span>
            {history.length > 0 && (
              <span style={{
                marginLeft: 4, fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 10,
                background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
              }}>
                {history.length}
              </span>
            )}
          </div>
          <span style={{ color: '#6b7280', fontSize: 12 }}>{historyOpen ? '▲' : '▼'}</span>
        </button>

        {historyOpen && (
          <div style={{ borderTop: '1px solid var(--border)', padding: 16 }}>
            {history.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                No saved tests yet. Run a test and click "Save Test" to record it.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map(entry => (
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 8,
                    background: '#12141a', border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: entry.hadMentions ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {entry.hadMentions ? <CheckCircle size={15} color="#10b981" /> : <XCircle size={15} color="#6b7280" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        "{entry.prompt}"
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} />
                          {formatDate(entry.date)}
                        </span>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>{entry.modelCount} model(s)</span>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: entry.hadMentions ? '#10b981' : '#6b7280',
                        }}>
                          {entry.hadMentions ? 'Mentions found' : 'No mentions'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
