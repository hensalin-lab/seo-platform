import { useState, useRef, useEffect } from 'react'
import { api } from '../api'
import { MessageSquare, X, Send } from 'lucide-react'

export default function AIChatWidget({ auditId, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hi! I\'m your AI SEO consultant. Ask me anything about this audit - why is a page not ranking, what keywords to target, how to improve, or how to beat competitors.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesRef = useRef(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setLoading(true)

    try {
      const res = await api.chat(auditId, msg)
      setMessages(prev => [...prev, { role: 'ai', text: res.response }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="chat-widget">
      <div className="chat-panel">
        <div className="chat-header">
          <MessageSquare size={16} style={{ color: 'var(--accent-blue)' }} />
          AI SEO Consultant
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div className="chat-messages" ref={messagesRef}>
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role === 'user' ? 'user' : 'ai'}`}>
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="chat-msg ai">
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            </div>
          )}
        </div>

        <div className="chat-input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about SEO, keywords, competitors..."
            disabled={loading}
          />
          <button onClick={send} disabled={loading || !input.trim()}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
