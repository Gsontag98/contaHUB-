import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRightLeft, 
  Eye, 
  Link, 
  Unlink, 
  Landmark, 
  Building2, 
  Sparkles, 
  Check,
  Calendar,
  FileText
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

function formatCNPJ(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 14) return value;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export default function TableView() {
  const {
    reconciliationResult,
    searchQuery,
    filterStatus,
    setSelectedMatch,
    manualMatch,
    removeMatch,
    addToast
  } = useAppStore();

  const [selectedBankId, setSelectedBankId] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);

  if (!reconciliationResult) return null;

  const { matches = [], suggestions = [], missingInBank = [], missingInSupplier = [] } = reconciliationResult;

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      if (filterStatus === 'exact' && match.confidence !== 100) return false;
      if (filterStatus === 'warning' || filterStatus === 'unmatched_bank' || filterStatus === 'unmatched_supplier') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toUpperCase().trim();
        const bText = (match.bankItems || []).map(b => `${b.description} ${b.cnpj || ''} ${b.amount} ${b.date} ${b.document || ''}`).join(' ').toUpperCase();
        const sText = (match.supplierItems || []).map(s => `${s.description} ${s.cnpj || ''} ${s.amount} ${s.date} ${s.document || ''}`).join(' ').toUpperCase();
        const notes = (match.notes || '').toUpperCase();
        if (!bText.includes(q) && !sText.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [matches, filterStatus, searchQuery]);

  const filteredMissingBank = useMemo(() => {
    if (filterStatus === 'exact' || filterStatus === 'warning' || filterStatus === 'unmatched_supplier') return [];
    return missingInBank.filter(item => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toUpperCase().trim();
      return `${item.description} ${item.cnpj || ''} ${item.amount} ${item.date} ${item.document || ''}`.toUpperCase().includes(q);
    });
  }, [missingInBank, filterStatus, searchQuery]);

  const filteredMissingSupplier = useMemo(() => {
    if (filterStatus === 'exact' || filterStatus === 'warning' || filterStatus === 'unmatched_bank') return [];
    return missingInSupplier.filter(item => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toUpperCase().trim();
      return `${item.description} ${item.cnpj || ''} ${item.amount} ${item.date} ${item.document || ''}`.toUpperCase().includes(q);
    });
  }, [missingInSupplier, filterStatus, searchQuery]);

  const handleManualPairing = () => {
    const bankItem = missingInBank.find(b => b.id === selectedBankId);
    const supplierItem = missingInSupplier.find(s => s.id === selectedSupplierId);

    if (!bankItem || !supplierItem) {
      addToast('Selecione 1 item do Banco e 1 item do Fornecedor para vincular.', 'warning');
      return;
    }

    manualMatch(bankItem, supplierItem);
    setSelectedBankId(null);
    setSelectedSupplierId(null);
    addToast('✅ Lançamentos vinculados com sucesso! Regra aprendida no dicionário De-Para.', 'success');
  };

  const handleApproveSuggestion = (sug) => {
    manualMatch(sug.bankItem, sug.supplierItem);
    addToast(`✅ Sugestão aprovada! Conciliado com ${sug.type === 'JUROS_MULTA' ? 'Juros/Encargos' : 'Desconto'}.`, 'success');
  };

  return (
    <div className="table-view-container">
      {/* SUGGESTIONS BANNER (JUROS / DESCONTOS EM BOLETOS) */}
      {(filterStatus === 'all' || filterStatus === 'warning') && suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> Sugestões Inteligentes de Juros / Descontos ({suggestions.length})
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '12px' }}>
            {suggestions.map(sug => (
              <div key={sug.id} className="card" style={{ borderLeft: '4px solid var(--color-warning)', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="badge badge-warning">
                    {sug.type === 'JUROS_MULTA' ? 'Juros / Encargos' : 'Desconto Obtido'} (Diff: {formatCurrency(sug.diff)})
                  </span>
                  <button className="btn btn-primary btn-sm" onClick={() => handleApproveSuggestion(sug)}>
                    <Check size={13} /> Aprovar Vínculo
                  </button>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  <strong>Banco:</strong> {sug.bankItem.description} ({formatCurrency(sug.bankItem.amount)})
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <strong>Fornecedor:</strong> {sug.supplierItem.description} ({formatCurrency(sug.supplierItem.amount)})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONCILIADOS LIST */}
      {filteredMatches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <CheckCircle2 size={18} /> Lançamentos Conciliados ({filteredMatches.length})
            </h4>
          </div>

          <div className="matches-list">
            {filteredMatches.map(match => {
              const b = match.bankItems[0] || {};
              const s = match.supplierItems[0] || {};
              const isNtoOne = match.supplierItems.length > 1;

              return (
                <div key={match.id} className="match-row-card">
                  {/* BANK SIDE */}
                  <div className="match-side bank">
                    <div className="match-side-top">
                      <div className="match-side-title">
                        <Landmark size={14} />
                        <span>Extrato Banco</span>
                      </div>
                      <span className="match-date-badge">
                        <Calendar size={11} />
                        {b.date?.split('-').reverse().join('/')}
                      </span>
                    </div>

                    <div className="match-desc" title={b.description}>
                      {b.description}
                    </div>

                    <div className="match-side-bottom">
                      <div className="match-meta-tags">
                        {b.cnpj && <span className="meta-tag">CNPJ: {formatCNPJ(b.cnpj)}</span>}
                        {b.document && <span className="meta-tag">Doc: {b.document}</span>}
                      </div>
                      <div className="match-amount bank-amount">
                        {formatCurrency(b.amount)}
                      </div>
                    </div>
                  </div>

                  {/* CENTER MATCH CONNECTOR & BADGE */}
                  <div className="match-center-badge">
                    <div className="connector-circle">
                      <ArrowRightLeft size={16} />
                    </div>
                    <span className={`badge ${match.badgeClass || 'badge-exact'}`}>
                      {match.passName}
                    </span>
                    <span className="confidence-text">
                      {match.confidence}% Confiança
                    </span>
                    <div className="match-action-btns">
                      <button
                        className="btn-icon match-btn-eye"
                        onClick={() => setSelectedMatch(match)}
                        title="Ver Detalhes do Vínculo"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn-icon match-btn-unlink"
                        onClick={() => removeMatch(match.id)}
                        title="Desvincular Lançamento"
                      >
                        <Unlink size={14} />
                      </button>
                    </div>
                  </div>

                  {/* SUPPLIER SIDE */}
                  <div className="match-side supplier">
                    <div className="match-side-top">
                      <div className="match-side-title">
                        <Building2 size={14} />
                        <span>Razão Fornecedor {isNtoOne && `(${match.supplierItems.length} títulos)`}</span>
                      </div>
                      <span className="match-date-badge">
                        <Calendar size={11} />
                        {s.date?.split('-').reverse().join('/')}
                      </span>
                    </div>

                    <div className="match-desc" title={s.description}>
                      {isNtoOne ? `${match.supplierItems.length} notas fiscais agrupadas (Soma N:1)` : s.description}
                    </div>

                    <div className="match-side-bottom">
                      <div className="match-meta-tags">
                        {s.cnpj && <span className="meta-tag">CNPJ: {formatCNPJ(s.cnpj)}</span>}
                        {s.document && <span className="meta-tag">Doc: {s.document}</span>}
                      </div>
                      <div className="match-amount supplier-amount">
                        {formatCurrency(isNtoOne ? match.supplierItems.reduce((acc, cur) => acc + cur.amount, 0) : s.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MANUAL PAIRING & UNMATCHED SECTION */}
      {(filteredMissingBank.length > 0 || filteredMissingSupplier.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Pendências Não Conciliadas (Vínculo Manual)
            </h4>
            {selectedBankId && selectedSupplierId && (
              <button className="btn btn-primary" onClick={handleManualPairing}>
                <Link size={16} /> Vincular Lançamentos Selecionados
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* UNMATCHED BANK */}
            <div className="card" style={{ padding: '14px' }}>
              <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--bank-color)', marginBottom: '10px' }}>
                BANCO — {filteredMissingBank.length} PENDENTES
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                {filteredMissingBank.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedBankId(selectedBankId === item.id ? null : item.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: selectedBankId === item.id ? 'var(--bank-bg)' : 'var(--bg-card)',
                      border: `1px solid ${selectedBankId === item.id ? 'var(--bank-color)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                        {item.description}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bank-color)' }}>
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      {item.date?.split('-').reverse().join('/')} {item.document && `| Doc: ${item.document}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* UNMATCHED SUPPLIER */}
            <div className="card" style={{ padding: '14px' }}>
              <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--supplier-color)', marginBottom: '10px' }}>
                FORNECEDOR — {filteredMissingSupplier.length} PENDENTES
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                {filteredMissingSupplier.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedSupplierId(selectedSupplierId === item.id ? null : item.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: selectedSupplierId === item.id ? 'var(--supplier-bg)' : 'var(--bg-card)',
                      border: `1px solid ${selectedSupplierId === item.id ? 'var(--supplier-color)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                        {item.description}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--supplier-color)' }}>
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      {item.date?.split('-').reverse().join('/')} {item.document && `| Doc: ${item.document}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
