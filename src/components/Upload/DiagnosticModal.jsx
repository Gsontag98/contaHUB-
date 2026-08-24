import { X, Activity, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import useAppStore from '../../store/useAppStore.js';

export default function DiagnosticModal() {
  const { diagnosticModalFile, setDiagnosticModalFile, addToast } = useAppStore();
  const [copied, setCopied] = useState(false);

  if (!diagnosticModalFile) return null;

  const handleCopyLogs = () => {
    const text = (diagnosticModalFile.logs || []).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('Logs copiados para a área de transferência.', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={() => setDiagnosticModalFile(null)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Diagnóstico do Arquivo — {diagnosticModalFile.name}
            </h3>
          </div>
          <button className="btn-outline btn-sm" onClick={() => setDiagnosticModalFile(null)}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div className="card" style={{ padding: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TAMANHO</span>
              <p style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{(diagnosticModalFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <div className="card" style={{ padding: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>COLUNAS BRUTAS</span>
              <p style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{diagnosticModalFile.headers?.length || 0}</p>
            </div>
            <div className="card" style={{ padding: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ITENS VÁLIDOS</span>
              <p style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>{diagnosticModalFile.items?.length || 0}</p>
            </div>
          </div>

          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Logs de Execução do Parser:
          </h4>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: 'var(--accent-cyan)',
            height: '240px',
            overflowY: 'auto',
            lineHeight: '1.6'
          }}>
            {(diagnosticModalFile.logs && diagnosticModalFile.logs.length > 0) ? (
              diagnosticModalFile.logs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))
            ) : (
              <div>Nenhum log registrado para este arquivo.</div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={handleCopyLogs}>
            {copied ? <Check size={14} /> : <Copy size={14} />} Copiar Logs
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setDiagnosticModalFile(null)}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
