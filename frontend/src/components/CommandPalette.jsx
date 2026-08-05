import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command, FileText, Plus } from 'lucide-react';
import { getIcon, mainNav, flattenAuditItems } from '../config/routes.config';

function buildSearchItems(auditId) {
  const base = auditId ? `/audit/${auditId}` : '';
  const items = [];

  items.push({ id: 'new-audit', label: 'New Audit', category: 'Actions', path: '/new', icon: 'Plus' });
  items.push({ id: 'export-report', label: 'Export Report', category: 'Actions', action: 'export', icon: 'FileText' });
  items.push({ id: 'history', label: 'Audit History', category: 'Actions', path: '/history', icon: 'FileText' });

  const pages = flattenAuditItems()
    .filter(p => p.suffix)
    .map(p => ({ id: p.suffix.slice(1), label: p.label, suffix: p.suffix, icon: p.icon }));

  if (auditId) {
    pages.forEach(p => {
      items.push({ ...p, category: 'Pages', path: `${base}${p.suffix}` });
      items.push({ id: `mod-${p.id}`, label: `${p.label} Module`, category: 'Modules', path: `${base}${p.suffix}`, icon: p.icon });
    });
  } else {
    pages.forEach(p => {
      items.push({ ...p, category: 'Pages', path: `${base}${p.suffix}`, disabled: !auditId });
    });
  }

  mainNav.forEach(m => {
    if (m.path === '/new' || m.path === '/history') return;
    items.push({ id: m.path.slice(1), label: m.label, category: 'Pages', path: m.path, icon: m.icon });
  });

  return items;
}

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: '#60a5fa', fontWeight: 600 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function CommandPalette({ isOpen, onClose, auditId }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const allItems = useMemo(() => buildSearchItems(auditId), [auditId]);

  const results = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    const filtered = allItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
    const groups = {};
    filtered.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [query, allItems]);

  const flatResults = useMemo(() => {
    return Object.values(results).flat();
  }, [results]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = useCallback((item) => {
    if (!item) return;
    if (item.action === 'export') {
      window.dispatchEvent(new CustomEvent('export-report'));
    } else if (item.path) {
      navigate(item.path);
    }
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(flatResults[selectedIndex]);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, flatResults, selectedIndex, handleSelect, onClose]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const active = el.querySelector('.cmd-palette-item-active');
    if (active) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
        }}
      />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 600, maxWidth: '90vw',
          background: 'var(--bg-white)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          animation: 'cmdFadeIn 0.15s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <Search size={18} color="#6b7280" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search modules, pages, actions..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 15, lineHeight: '24px',
            }}
          />
          <kbd style={{
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '3px 7px', borderRadius: 4,
            background: 'var(--border)', color: 'var(--text-muted)',
            fontSize: 11, fontFamily: 'inherit', flexShrink: 0,
          }}>
            <Command size={12} />K
          </kbd>
        </div>

        <div ref={listRef} style={{ maxHeight: 420, overflowY: 'auto', padding: '6px 0' }}>
          {!query && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6b7280', fontSize: 13, lineHeight: '20px' }}>
              Type to search modules, pages, and actions
            </div>
          )}

          {query && Object.keys(results).length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
              No results found for "<span style={{ color: 'var(--text-muted)' }}>{query}</span>"
            </div>
          )}

          {Object.entries(results).map(([category, items]) => {
            const categoryStartIndex = flatResults.indexOf(items[0]);
            return (
              <div key={category}>
                <div style={{
                  padding: '8px 16px 4px', fontSize: 10, fontWeight: 600,
                  color: '#6b7280', letterSpacing: '0.5px', textTransform: 'uppercase',
                }}>
                  {category}
                </div>
                {items.map((item, i) => {
                  const globalIdx = categoryStartIndex + i;
                  const isActive = globalIdx === selectedIndex;
                  const Icon = getIcon(item.icon);
                  return (
                    <div
                      key={item.id}
                      className={isActive ? 'cmd-palette-item-active' : ''}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 16px', cursor: 'pointer',
                        background: isActive ? 'rgba(96,165,250,0.12)' : 'transparent',
                        borderLeft: isActive ? '2px solid #60a5fa' : '2px solid transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isActive ? 'rgba(96,165,250,0.2)' : 'var(--border)',
                        flexShrink: 0,
                      }}>
                        <Icon size={14} color={isActive ? '#60a5fa' : 'var(--text-muted)'} />
                      </div>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', lineHeight: '20px' }}>
                        {highlightMatch(item.label, query)}
                      </span>
                      {item.disabled && (
                        <span style={{ fontSize: 10, color: '#6b7280', background: 'var(--border)', padding: '2px 6px', borderRadius: 3 }}>No audit</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '8px 16px', borderTop: '1px solid var(--border)',
          fontSize: 11, color: '#6b7280',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ background: 'var(--border)', padding: '1px 5px', borderRadius: 3, color: 'var(--text-muted)', fontSize: 10, fontFamily: 'inherit' }}>↑↓</kbd> navigate
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ background: 'var(--border)', padding: '1px 5px', borderRadius: 3, color: 'var(--text-muted)', fontSize: 10, fontFamily: 'inherit' }}>↵</kbd> select
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ background: 'var(--border)', padding: '1px 5px', borderRadius: 3, color: 'var(--text-muted)', fontSize: 10, fontFamily: 'inherit' }}>esc</kbd> close
          </span>
        </div>
      </div>

      <style>{`
        @keyframes cmdFadeIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cmd-palette-item-active {
          background: rgba(96,165,250,0.12) !important;
          border-left-color: #60a5fa !important;
        }
        input::placeholder { color: #6b7280; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
      `}</style>
    </div>
  );
}
