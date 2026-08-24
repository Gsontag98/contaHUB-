import { X, CheckCircle2, AlertTriangle, Unlink, Landmark, Building2, Calendar, FileText, Hash } from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function MatchDetailPanel() {
  const { selectedMatch, setSelectedMatch, removeMatch, addToast } = useAppStore();

  if (!selectedMatch) return null;

  const b = selectedMatch.bankItems[0] || {};
  const s = selectedMatch.supplierItems[0] || {};

  const handleUnmatch = () => {
    removeMatch(selectedMatch.id);
    addToast('Lançamento desvinculado com sucesso.', 'info');
  };

  return (
    <div className="detail-panel-overlay" onClick={() => setSelectedMatch(null)}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={20} color="var(--color-success)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Auditoria do Vínculo</h3>
          </div>
          <button className="btn-outline btn-sm" onClick={() => setSelectedMatch(null)}>
            <X size={16} />
          </button>
        </div>

        <div className="detail-panel-body">
          {/* CRITERIA CARD */}
          <div className="detail-section">
            <h4>Critério de Conciliação</h4>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className={`badge ${selectedMatch.badgeClass || 'badge-exact'}`}>
                {selectedMatch.passName}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-success)' }}>
                {selectedMatch.confidence}% de Certeza
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {selectedMatch.notes || 'Correspondência confirmada por rigor matemático e metadados contábeis.'}
            </p>
          </div>

          {/* BANK ITEM */}
          <div className="detail-section">
            <h4 style={{ color: 'var(--bank-color)' }}>
              <Landmark size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Extrato Bancário
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Histórico:</span>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.description}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Data:</span>
                  <p style={{ fontFamily: 'var(--font-mono)' }}>{b.date?.split('-').reverse().join('/')}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Valor:</span>
                  <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--bank-color)' }}>
                    {formatCurrency(b.amount)}
                  </p>
                </div>
              </div>
              {b.document && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Documento / NF:</span>
                  <p style={{ fontFamily: 'var(--font-mono)' }}>{b.document}</p>
                </div>
              )}
              {b.cnpj && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>CNPJ:</span>
                  <p style={{ fontFamily: 'var(--font-mono)' }}>{b.cnpj}</p>
                </div>
              )}
            </div>
          </div>

          {/* SUPPLIER ITEM */}
          <div className="detail-section">
            <h4 style={{ color: 'var(--supplier-color)' }}>
              <Building2 size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Razão de Fornecedores
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Razão Social / Histórico:</span>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.description}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Data:</span>
                  <p style={{ fontFamily: 'var(--font-mono)' }}>{s.date?.split('-').reverse().join('/')}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Valor:</span>
                  <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--supplier-color)' }}>
                    {formatCurrency(s.amount)}
                  </p>
                </div>
              </div>
              {s.document && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Documento / NF:</span>
                  <p style={{ fontFamily: 'var(--font-mono)' }}>{s.document}</p>
                </div>
              )}
              {s.cnpj && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>CNPJ:</span>
                  <p style={{ fontFamily: 'var(--font-mono)' }}>{s.cnpj}</p>
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
            <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleUnmatch}>
              <Unlink size={16} /> Desfazer Conciliação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
