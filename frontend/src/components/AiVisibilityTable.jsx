import { CheckCircle, XCircle, Sparkles } from 'lucide-react';

export default function AiVisibilityTable({ platformData = [] }) {
  if (!platformData || platformData.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 12 }}>
        <Sparkles size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
        <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: 14 }}>No Platform Citations Tracked Yet</h4>
        <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>
          Run an AI Search Scan to test brand mentions across ChatGPT, Perplexity, and Gemini.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Platform</th>
            <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Brand Mentioned?</th>
            <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Sentiment</th>
            <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Snippet / Citation</th>
          </tr>
        </thead>
        <tbody>
          {platformData.map((row, idx) => {
            const isMentioned = row.brand_mentioned ?? row.mentioned ?? false;
            const sentiment = (row.sentiment || 'NEUTRAL').toUpperCase();
            let sentimentBg = '#f1f5f9';
            let sentimentColor = '#475569';
            if (sentiment === 'POSITIVE') { sentimentBg = '#ecfdf5'; sentimentColor = '#047857'; }
            if (sentiment === 'NEGATIVE') { sentimentBg = '#fef2f2'; sentimentColor = '#b91c1c'; }

            return (
              <tr key={idx} style={{ borderBottom: idx < platformData.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                  {row.platform || row.name || row.platform_name || 'Unknown'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {isMentioned ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#047857', fontWeight: 600 }}>
                      <CheckCircle size={15} /> Yes
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#b91c1c', fontWeight: 500 }}>
                      <XCircle size={15} /> No
                    </span>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: sentimentBg, color: sentimentColor }}>
                    {sentiment}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#475569', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.snippet || row.citation_url || row.url || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
