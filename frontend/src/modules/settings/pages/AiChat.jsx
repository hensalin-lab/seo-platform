import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { Send, Bot, User, Target, Zap, Lightbulb, Brain, Globe, BarChart3, ChevronRight, ExternalLink, TrendingUp } from 'lucide-react';
import ScoreRing from '../../../components/ScoreRing';

const QUICK_ACTIONS = [
  { label: 'Top issues & fixes', icon: Target, prompt: 'List my top 5 SEO issues with exact URLs affected and step-by-step fix instructions for each.' },
  { label: 'Fix priority plan', icon: Zap, prompt: 'Create a prioritized fix plan. Rank every issue by impact and effort. Give me a week-by-week roadmap.' },
  { label: 'Content strategy', icon: Lightbulb, prompt: 'Analyze my content gaps. What pages am I missing? What topics should I create content for?' },
  { label: 'AI search ready?', icon: Brain, prompt: 'How does my site appear in AI search (ChatGPT, Perplexity, Gemini)? What do I need to fix?' },
  { label: 'Competitor gaps', icon: TrendingUp, prompt: 'Compare my site with my competitor. What keywords are they ranking for that I am not?' },
];

function formatMarkdown(text) {
  if (!text) return '';
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:var(--bg-secondary);padding:12px;border-radius:8px;font-size:12px;overflow-x:auto;margin:8px 0"><code>$2</code></pre>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code style="background:var(--bg-secondary);padding:1px 4px;border-radius:3px;font-size:0.9em">$1</code>');
  html = html.replace(/^### (.+)/gm, '<h4 style="font-size:14px;font-weight:700;margin:12px 0 4px;color:var(--text)">$1</h4>');
  html = html.replace(/^## (.+)/gm, '<h3 style="font-size:15px;font-weight:700;margin:14px 0 6px;color:var(--text)">$1</h3>');
  html = html.replace(/\n- (.+)/g, '\n&#8226; $1');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

function SidebarStat({ label, value, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 10px', borderRadius: 6, border: 'none', background: 'transparent',
      cursor: onClick ? 'pointer' : 'default', width: '100%', textAlign: 'left', fontFamily: 'inherit',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: color || 'var(--text)' }}>{value}</span>
        {onClick && <ChevronRight size={11} style={{ color: 'var(--text-dim)' }} />}
      </div>
    </button>
  );
}

export default function AiChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [auditInfo, setAuditInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const initDone = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, sending, scrollToBottom]);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    async function init() {
      try {
        const [historyRes, auditRes] = await Promise.allSettled([
          api.getChatHistory(id),
          api.getAuditDetail(id),
        ]);
        if (historyRes.status === 'fulfilled') {
          const data = historyRes.value;
          const history = Array.isArray(data) ? data : data.messages || [];
          setMessages(history.map(m => ({
            role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
            content: m.content || m.message || '',
            created_at: m.created_at || m.timestamp || null,
          })));
        }
        if (auditRes.status === 'fulfilled') setAuditInfo(auditRes.value);
      } catch { /* silent */ }
    }
    init();
  }, [id]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    const userMessage = { role: 'user', content: msg, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);
    try {
      const res = await api.chat(id, msg);
      const reply = res.reply || res.response || res.message || 'No response received.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply, created_at: new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', created_at: new Date().toISOString() }]);
    } finally { setSending(false); inputRef.current?.focus(); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const websiteUrl = auditInfo?.website_url || '';
  const scores = auditInfo?.scores || {};
  const overall = scores.overall_score ?? auditInfo?.overall_score ?? 0;
  const seo = scores.seo_score ?? auditInfo?.seo_score ?? 0;
  const tech = scores.technical_score ?? auditInfo?.technical_score ?? 0;
  const aeo = scores.aeo_score ?? auditInfo?.aeo_score ?? 0;
  const geo = scores.geo_score ?? auditInfo?.geo_score ?? 0;
  const content = scores.content_score ?? auditInfo?.content_score ?? 0;
  const aiVis = scores.ai_visibility_score ?? auditInfo?.ai_visibility_score ?? 0;
  const hasMessages = messages.length > 0;

  return (
    <div style={styles.page}>
      <div style={styles.mainArea}>
        {/* CHAT COLUMN */}
        <div style={styles.chatWrapper}>
          <div style={styles.infoPanel}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.infoPanelIcon}><Bot size={15} /></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>AI SEO Consultant</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{websiteUrl}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: overall >= 80 ? '#d3f9d8' : overall >= 50 ? '#fff3bf' : '#ffe3e3',
                  color: overall >= 80 ? '#2b8a3e' : overall >= 50 ? '#e67700' : '#c92a2a',
                }}>{Math.round(overall)}</div>
                <button onClick={() => setSidebarOpen(!sidebarOpen)} style={styles.toggleBtn}>
                  {sidebarOpen ? 'Hide' : 'Panel'}
                </button>
              </div>
            </div>
          </div>

          <div style={styles.messagesArea}>
            {!hasMessages && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '28px 20px' }}>
                <div style={styles.welcomeIcon}><Bot size={32} /></div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>AI SEO Consultant</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 400, marginBottom: 12 }}>
                  I have analyzed your site ({auditInfo?.total_pages || 0} pages).
                  Ask me anything about SEO, content, technical issues, or AI search.
                </p>
                {websiteUrl && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 16, fontSize: 12, fontWeight: 500, marginBottom: 12 }}>
                    <Globe size={12} />{websiteUrl}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[{ l: 'SEO', v: seo }, { l: 'Tech', v: tech }, { l: 'AEO', v: aeo }, { l: 'GEO', v: geo }].map(s => (
                    <ScoreRing key={s.l} score={s.v} size={58} label={s.l} stroke={5} />
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ ...styles.messageRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && <div style={styles.avatar}><Bot size={14} /></div>}
                <div style={{ maxWidth: '74%' }}>
                  <div style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} />
                  {msg.created_at && (
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3, padding: '0 4px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                      {formatTime(msg.created_at)}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && <div style={{ ...styles.avatar, background: 'var(--accent)' }}><User size={14} /></div>}
              </div>
            ))}

            {sending && (
              <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
                <div style={styles.avatar}><Bot size={14} /></div>
                <div style={styles.typingBubble}>
                  <span style={styles.typingDot} />
                  <span style={{ ...styles.typingDot, animationDelay: '0.15s' }} />
                  <span style={{ ...styles.typingDot, animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputArea}>
            {!hasMessages && (
              <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                {QUICK_ACTIONS.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <button key={i} style={styles.quickBtn} onClick={() => sendMessage(action.prompt)} disabled={sending}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-white)'; }}
                    >
                      <Icon size={12} />{action.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={styles.inputContainer}>
              <input ref={inputRef} type="text" placeholder="Ask your SEO consultant..."
                value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                disabled={sending} style={styles.inputField} />
              <button style={{ ...styles.sendBtn, opacity: input.trim() && !sending ? 1 : 0.4 }}
                onClick={() => sendMessage()} disabled={!input.trim() || sending}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        {sidebarOpen && (
          <div style={styles.sidebar}>
            <div style={styles.sideSection}>
              <div style={styles.sideHeading}>Score</div>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                <ScoreRing score={overall} size={90} label="Overall" stroke={5} />
              </div>
            </div>

            <div style={styles.sideSection}>
              <div style={styles.sideHeading}>Breakdown</div>
              <SidebarStat label="SEO" value={Math.round(seo)} color={seo >= 80 ? '#12b886' : seo >= 50 ? '#f59f00' : '#fa5252'} onClick={() => navigate(`/audit/${id}/seo`)} />
              <SidebarStat label="Technical" value={Math.round(tech)} color={tech >= 80 ? '#12b886' : tech >= 50 ? '#f59f00' : '#fa5252'} onClick={() => navigate(`/audit/${id}/seo?tab=enterprise`)} />
              <SidebarStat label="AEO" value={Math.round(aeo)} color={aeo >= 80 ? '#12b886' : aeo >= 50 ? '#f59f00' : '#fa5252'} onClick={() => navigate(`/audit/${id}/geo-aeo?tab=aeo-analysis`)} />
              <SidebarStat label="GEO" value={Math.round(geo)} color={geo >= 80 ? '#12b886' : geo >= 50 ? '#f59f00' : '#fa5252'} onClick={() => navigate(`/audit/${id}/geo-aeo?tab=geo-analysis`)} />
              <SidebarStat label="Content" value={Math.round(content)} color={content >= 80 ? '#12b886' : content >= 50 ? '#f59f00' : '#fa5252'} onClick={() => navigate(`/audit/${id}/content-intel?tab=content`)} />
              <SidebarStat label="AI Visibility" value={Math.round(aiVis)} color={aiVis >= 80 ? '#12b886' : aiVis >= 50 ? '#f59f00' : '#fa5252'} onClick={() => navigate(`/audit/${id}/geo-aeo?tab=ai-visibility`)} />
            </div>

            <div style={styles.sideSection}>
              <div style={styles.sideHeading}>Pages: {auditInfo?.total_pages || '-'}</div>
              <SidebarStat label="SEO Analysis" value="" onClick={() => navigate(`/audit/${id}/seo`)} />
              <SidebarStat label="Recommendations" value="" onClick={() => navigate(`/audit/${id}/action-hub?tab=recommendations-list`)} />
              <SidebarStat label="Content Audit" value="" onClick={() => navigate(`/audit/${id}/content-intel?tab=content`)} />
              <SidebarStat label="Full Strategy" value="" onClick={() => navigate(`/audit/${id}/action-hub?tab=recommendations-list`)} />
              <SidebarStat label="AI Visibility" value="" onClick={() => navigate(`/audit/${id}/geo-aeo?tab=ai-visibility`)} />
            </div>

            <div style={styles.sideSection}>
              <div style={{ display: 'flex', gap: 6, padding: '0 10px' }}>
                <a href={websiteUrl} target="_blank" rel="noreferrer" style={styles.sideLink}><ExternalLink size={11} /> Visit</a>
                <button onClick={() => navigate(`/audit/${id}/dashboard`)} style={styles.sideLink}><BarChart3 size={11} /> Report</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)', padding: 0, margin: '0 -24px -24px' },
  mainArea: { flex: 1, display: 'flex', overflow: 'hidden' },
  chatWrapper: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  infoPanel: { background: 'var(--bg-white)', borderBottom: '1px solid var(--border)', padding: '8px 20px', flexShrink: 0 },
  infoPanelIcon: { width: 30, height: 30, borderRadius: 6, background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 },
  toggleBtn: { fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' },
  messagesArea: { flex: 1, overflowY: 'auto', padding: '16px 20px 6px', display: 'flex', flexDirection: 'column', gap: 14 },
  welcomeIcon: { width: 56, height: 56, borderRadius: 12, background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: 12, boxShadow: '0 6px 20px rgba(37,99,235,0.2)' },
  messageRow: { display: 'flex', alignItems: 'flex-end', gap: 6, animation: 'fadeInUp 0.2s ease' },
  avatar: { width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 },
  bubbleUser: { background: 'var(--accent)', color: 'white', padding: '9px 14px', borderRadius: '16px 16px 4px 16px', fontSize: 13, lineHeight: 1.5, boxShadow: 'var(--shadow-sm)', wordBreak: 'break-word' },
  bubbleAssistant: { background: 'var(--bg-white)', color: 'var(--text)', padding: '9px 14px', borderRadius: '16px 16px 16px 4px', fontSize: 13, lineHeight: 1.5, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', wordBreak: 'break-word' },
  typingBubble: { display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-white)', border: '1px solid var(--border)', padding: '10px 16px', borderRadius: '16px 16px 16px 4px', boxShadow: 'var(--shadow-sm)' },
  typingDot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--text-dim)', display: 'inline-block', animation: 'typingBounce 1.2s ease-in-out infinite' },
  inputArea: { borderTop: '1px solid var(--border)', background: 'var(--bg-white)', padding: '8px 20px 12px', flexShrink: 0 },
  quickBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 16, background: 'var(--bg-white)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'inherit' },
  inputContainer: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', borderRadius: 8, padding: '5px 5px 5px 14px', border: '1px solid var(--border)' },
  inputField: { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', padding: '6px 0' },
  sendBtn: { width: 36, height: 36, borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  sidebar: { width: 260, background: 'var(--bg-white)', borderLeft: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 },
  sideSection: { padding: '10px 8px', borderBottom: '1px solid var(--border)' },
  sideHeading: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-dim)', marginBottom: 4, paddingLeft: 10 },
  sideLink: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' },
};
