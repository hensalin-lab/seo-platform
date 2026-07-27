import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { api } from '../api';
import { generatePDFReport } from '../utils/pdfReport';

export default function PdfDownloadButton({ auditId, variant = 'primary' }) {
  const [generating, setGenerating] = useState(false);
  
  const handleDownload = async () => {
    setGenerating(true);
    try {
      const reportData = await api.getReportData(auditId);
      const blob = generatePDFReport(reportData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SEO-Report-${reportData.audit_url?.replace(/https?:\/\//, '').replace(/\//g, '-') || auditId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      className={`btn btn-${variant}`}
      onClick={handleDownload}
      disabled={generating}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
    >
      {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      {generating ? 'Generating...' : 'Download PDF Report'}
    </button>
  );
}
