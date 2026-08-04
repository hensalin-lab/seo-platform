import { CheckCircle, XCircle, FileText, Table, List, Code } from 'lucide-react';

const CHECK_ITEMS = [
  { key: 'direct_answers', label: 'Direct Answer Paragraphs under H2', desc: '40–60 word clear definitions answering "what is X?" under H2 tags', icon: FileText },
  { key: 'comparison_tables', label: 'Structured Comparison Tables', desc: 'Organized data tables comparing features, pros/cons, or pricing', icon: Table },
  { key: 'bulleted_takeaways', label: 'Bulleted Takeaways', desc: 'Scannable bullet-point summaries for quick extraction', icon: List },
  { key: 'faq_schema', label: 'FAQPage JSON-LD Schema', desc: 'Valid FAQ structured data for featured snippet eligibility', icon: Code },
  { key: 'howto_schema', label: 'HowTo JSON-LD Schema', desc: 'Step-by-step instructions marked up as HowTo schema', icon: Code },
  { key: 'entity_definitions', label: 'Entity-Rich Definitions', desc: 'Key terms, stats, and data points easily extractable by AI', icon: FileText },
];

export default function LlmExtractionChecklist({ data, onToggle }) {
  const results = CHECK_ITEMS.reduce((acc, item) => ({
    ...acc,
    [item.key]: data?.[item.key] ?? false,
  }), {});

  const doneCount = Object.values(results).filter(Boolean).length;

  return (
    <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#4c1d95' }}>LLM Answer Extraction Checklist</div>
          <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 2 }}>{doneCount}/{CHECK_ITEMS.length} checks passed</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: doneCount === CHECK_ITEMS.length ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={20} color={doneCount === CHECK_ITEMS.length ? '#12b886' : '#7c3aed'} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {CHECK_ITEMS.map((item) => {
          const done = results[item.key];
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              onClick={() => onToggle?.(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 8, cursor: onToggle ? 'pointer' : 'default',
                background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.6)',
                border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : 'rgba(221,214,254,0.5)'}`,
                transition: 'all 0.15s',
              }}
            >
              {done ? <CheckCircle size={16} color="#12b886" /> : <XCircle size={16} color="#94a3b8" />}
              <Icon size={14} color={done ? '#12b886' : '#7c3aed'} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: done ? '#065f46' : '#1e293b' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
