import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Code, CheckCircle, XCircle, Layers, AlertTriangle } from 'lucide-react';

export default function SchemaAnalysis() {
  const { id } = useParams();
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSchema() {
      try {
        setLoading(true);
        const data = await api.getSchemaAnalysis(id);
        setSchema(data);
      } catch (err) {
        setError(err.message || 'Failed to load schema analysis');
      } finally {
        setLoading(false);
      }
    }
    loadSchema();
  }, [id]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="loading-spinner" />
          <p>Loading schema analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <XCircle size={48} />
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  const signals = schema?.signals || {};
  const schemaTypes = schema?.schema_types || {};
  const coverage = schema?.coverage_pct ?? schema?.coverage ?? 0;
  const pagesWithSchema = schema?.pages_with_schema ?? 0;
  const totalPages = schema?.total_pages ?? 0;
  const pagesWithoutSchema = totalPages - pagesWithSchema;

  const getCoverageColor = (pct) => {
    if (pct >= 80) return 'badge-green';
    if (pct >= 50) return 'badge-yellow';
    return 'badge-red';
  };

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header">
          <Code size={20} />
          <div>
            <h2 className="card-title">Schema Analysis</h2>
            <p className="card-subtitle">Structured data markup coverage and signals</p>
          </div>
        </div>
      </div>

      <div className="grid-3" style={{ marginTop: '1rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="score-ring">
            <div className="score-value">{coverage}%</div>
            <div className="score-label">Schema Coverage</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <CheckCircle size={18} />
            <h3 className="card-title">Pages with Schema</h3>
          </div>
          <div style={{ padding: '1rem' }}>
            <span className="metric-value">{pagesWithSchema}</span>
            <span className="metric-label"> / {totalPages} pages</span>
            <div className="progress-bar" style={{ marginTop: '0.75rem' }}>
              <div
                className="progress-fill"
                style={{ width: `${totalPages > 0 ? (pagesWithSchema / totalPages) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <AlertTriangle size={18} />
            <h3 className="card-title">Pages without Schema</h3>
          </div>
          <div style={{ padding: '1rem' }}>
            <span className="metric-value">{pagesWithoutSchema}</span>
            <span className="metric-label"> pages missing markup</span>
          </div>
        </div>
      </div>

      {Object.keys(schemaTypes).length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <Layers size={18} />
            <h3 className="card-title">Schema Types Found</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Schema Type</th>
                  <th>Count</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(schemaTypes).map(([type, count]) => (
                  <tr key={type}>
                    <td><strong>{type}</strong></td>
                    <td>{count}</td>
                    <td>
                      <span className={`badge ${getCoverageColor(totalPages > 0 ? (count / totalPages) * 100 : 0)}`}>
                        {totalPages > 0 ? Math.round((count / totalPages) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {Object.keys(signals).length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <CheckCircle size={18} />
            <h3 className="card-title">Schema Signals</h3>
          </div>
          <div className="grid-3" style={{ padding: '1rem' }}>
            {Object.entries(signals).map(([key, signal]) => (
              <div className="signal-card" key={key}>
                <div className={`signal-score ${signal.score >= 80 ? 'badge-green' : signal.score >= 50 ? 'badge-yellow' : 'badge-red'}`}>
                  {signal.score ?? '—'}
                </div>
                <div className="signal-info">
                  <div className="signal-name">{signal.name || key.replace(/_/g, ' ')}</div>
                  <div className="signal-desc">{signal.description || ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(schemaTypes).length === 0 && Object.keys(signals).length === 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="empty-state">
            <Code size={48} />
            <p>No schema markup detected on any pages</p>
          </div>
        </div>
      )}
    </div>
  );
}