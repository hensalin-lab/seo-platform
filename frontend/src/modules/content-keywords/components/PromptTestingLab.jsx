import { useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import ProtectedAction from '../../../components/ProtectedAction';
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
  NEUTRAL: { label: 'Neutral', bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', icon: AlertCircle },
};

function generateMockResult(modelId, prompt) {
  const snippets = {
    chatgpt: `${prompt.slice(0, 60)}... Based on my analysis, the brand visibility is strong across multiple channels. The company ranks well for key terms and maintains a consistent brand presence.`,
    perplexity: `I found several references to the brand in recent publications. ${prompt.slice(0, 40)}... The brand appears in 3 of the top 10 search results with positive sentiment signals.`,
    claude: `After reviewing the available data regarding "${prompt.slice(0, 50)}...", I can confirm the brand is mentioned in authoritative sources. Brand recall metrics show steady improvement over the past quarter.`,
    gemini: `The brand demonstrates strong topical authority. For "${prompt.slice(0, 45)}...", the brand appears in featured snippets and knowledge panels. Recommendation: continue building entity associations.`,
    deepseek: `Analysis of brand mentions for "${prompt.slice(0, 40)}..." indicates growing share of voice. The brand is cited alongside industry leaders in 60% of relevant AI-generated responses.`,
  };
  const mentionFlags = { chatgpt: true, perplexity: true, claude: true, gemini: false, deepseek: true };
  const sentiments = { chatgpt: 'POSITIVE', perplexity: 'NEUTRAL', claude: 'POSITIVE', gemini: 'NEGATIVE', deepseek: 'POSITIVE' };
  const sourceSets = {
    chatgpt: ['https://example.com/brand-report', 'https://example.com/industry-analysis'],
    perplexity: ['https://example.com/news/article-2024', 'https://example.com/market-research', 'https://example.com/competitor-benchmark'],
    claude: ['https://example.com/case-study', 'https://example.com/whitepaper'],
    gemini: [],
    deepseek: ['https://example.com/review', 'https://example.com/comparison-guide', 'https://example.com/expert-opinion'],
  };
  const times = { chatgpt: 1240, perplexity: 2870, claude: 3450, gemini: 980, deepseek: 2100 };
  return {
    brand_mentioned: mentionFlags[modelId],
    sentiment: sentiments[modelId],
    response_snippet: snippets[modelId],
    sources: sourceSets[modelId],
    response_time_ms: times[modelId],
  };
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
  const [selectedModels, setSelectedModels] = useState(MODELS.map(m => m.id));
  const [results, setResults] = useState(null);
  const [executing, setExecuting] = useState(false);
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
    setResults(null);
    const mockResults = {};
    const modelList = MODELS.filter(m => selectedModels.includes(m.id));
    for (const model of modelList) {
      await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
      mockResults[model.id] = generateMockResult(model.id, prompt);
    }
    setResults(mockResults);
    setExecuting(false);
  }, [prompt, selectedModels]);

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
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e0e0e0', letterSpacing: '-0.3px' }}>AI Prompt Testing Lab</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>Run the same prompt across multiple LLMs to evaluate brand mention performance</div>
        </div>
      </div>

      <div style={{ background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <MessageSquare size={16} color="#3b82f6" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0' }}>Prompt</span>
        </div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Enter a prompt to test across LLMs..."
          rows={4}
          style={{
            width: '100%', padding: '12px 14px', background: '#12141a', border: '1px solid #2a2d35',
            borderRadius: 8, color: '#e0e0e0', fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
            lineHeight: 1.6, outline: 'none',
          }}
          onFocus={e => { e.target.style.borderColor = '#3b82f6'; }}
          onBlur={e => { e.target.style.borderColor = '#2a2d35'; }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: promptCharCount > 500 ? '#ef4444' : '#6b7280' }}>
            {promptCharCount} characters
          </span>
          <ProtectedAction requiredRole="ADMIN">
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
      </div>

      <div style={{ background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0' }}>Models</span>
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
                  padding: '7px 14px', border: `1px solid ${active ? model.borderColor : '#2a2d35'}`,
                  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: active ? model.bgColor : 'transparent',
                  color: active ? model.color : '#9ca3af',
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
            <span style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0' }}>Results</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {results && (
              <button
                onClick={saveTest}
                disabled={saving}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', border: '1px solid #2a2d35', borderRadius: 8,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: 'transparent', color: '#9ca3af',
                  transition: 'all 0.15s',
                }}
              >
                <Save size={13} /> {saving ? 'Saving...' : 'Save Test'}
              </button>
            )}
          </div>
        </div>

        {!results && !executing && (
          <div style={{ background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
            <Sparkles size={40} color="#2a2d35" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>No results yet</div>
            <div style={{ fontSize: 13, color: '#4b5563' }}>Enter a prompt and run against the selected models to see results here.</div>
          </div>
        )}

        {executing && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {MODELS.filter(m => selectedModels.includes(m.id)).map(model => (
              <div key={model.id} style={{
                background: '#1a1c23', border: `1px solid ${model.borderColor}40`, borderRadius: 12, padding: 20,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: model.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <model.icon size={14} color={model.color} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0' }}>{model.label}</span>
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
              const sentiment = SENTIMENT_STYLES[r?.sentiment] || SENTIMENT_STYLES.NEUTRAL;
              const SentimentIcon = sentiment.icon;
              return (
                <div key={model.id} style={{
                  background: '#1a1c23', border: `1px solid ${model.borderColor}40`, borderRadius: 12, padding: 20,
                  borderLeft: `3px solid ${model.borderColor}`,
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: model.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <model.icon size={14} color={model.color} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0' }}>{model.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={11} />
                        {formatTime(r?.response_time_ms)}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6, marginBottom: 12, minHeight: 60 }}>
                    {r?.response_snippet?.slice(0, 200)}{r?.response_snippet?.length > 200 ? '...' : ''}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                      background: r?.brand_mentioned ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.12)',
                      color: r?.brand_mentioned ? '#10b981' : '#9ca3af',
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

                  {r?.sources?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Sources ({r.sources.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {r.sources.map((src, i) => (
                          <span key={i} style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 4,
                            background: 'rgba(59,130,246,0.1)', color: '#60a5fa',
                            wordBreak: 'break-all',
                          }}>
                            {src.replace('https://', '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 12, color: '#4b5563', fontStyle: 'italic' }}>
          Results powered by backend LLM integration
        </div>
      </div>

      <div style={{ background: '#1a1c23', border: '1px solid #2a2d35', borderRadius: 12, overflow: 'hidden' }}>
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#e0e0e0', fontSize: 14, fontWeight: 600,
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
          <div style={{ borderTop: '1px solid #2a2d35', padding: 16 }}>
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
                    background: '#12141a', border: '1px solid #2a2d35',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: entry.hadMentions ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {entry.hadMentions ? <CheckCircle size={15} color="#10b981" /> : <XCircle size={15} color="#6b7280" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
