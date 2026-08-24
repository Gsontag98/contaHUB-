import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  Download, 
  FileText, 
  Settings2, 
  Check, 
  AlertTriangle, 
  Building2, 
  Landmark, 
  Eye, 
  Layers 
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { generateDominioTxtContent, downloadTxtFile, sanitizeDominioText } from '../../engine/dominioTxt.js';
import { exportReport } from '../../engine/exporter.js';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ExportModal({ isOpen, onClose }) {
  const { 
    reconciliationResult, 
    activeCompany, 
    planosList,
    activePlanoId,
    addToast 
  } = useAppStore();

  const [exportFormat, setExportFormat] = useState('txt'); // 'txt' | 'excel'
  const [bankAccount, setBankAccount] = useState('');

  // Extract accounts from active plan
  const activeAccounts = useMemo(() => {
    const plan = planosList.find(p => p.id === activePlanoId) || planosList[0];
    if (!plan || !plan.accounts) return [];
    return plan.accounts.filter(acc => !acc.isSynthetic);
  }, [planosList, activePlanoId]);

  if (!isOpen || !reconciliationResult) return null;

  const { matches = [] } = reconciliationResult;
  const company = activeCompany || { name: 'Empresa', cnpj: '00000000000191' };

  // Calculate total monetary value
  const totalAmount = matches.reduce((acc, m) => {
    const val = m.amount || (m.bankItems && m.bankItems[0] && m.bankItems[0].amount) || 0;
    return acc + Math.abs(val);
  }, 0);

  // Generate preview of first 5 transactions
  const previewRows = matches.slice(0, 5).map(m => {
    const b = (m.bankItems && m.bankItems[0]) || {};
    const isIncome = (b.amount || m.amount || 0) > 0;
    
    let debit = m.debitAccount || '';
    let credit = m.creditAccount || '';

    if (bankAccount) {
      if (!debit && !credit) {
        if (isIncome) {
          debit = bankAccount;
          credit = '1101';
        } else {
          debit = '2101';
          credit = bankAccount;
        }
      } else if (!debit && credit) {
        debit = bankAccount;
      } else if (debit && !credit) {
        credit = bankAccount;
      }
    }

    const d = String(m.date || b.date || '').split('T')[0];
    const dateFormatted = d.includes('-') ? d.split('-').reverse().join('/') : d;

    return {
      id: m.id,
      date: dateFormatted,
      debit: debit || '2101',
      credit: credit || (bankAccount || '777'),
      value: Math.abs(m.amount || b.amount || 0),
      codHist: m.historicCode || '10',
      histText: sanitizeDominioText(m.historicText || m.description || b.description || 'PAGAMENTO CONCILIADO')
    };
  });

  const handleExportTxt = () => {
    if (matches.length === 0) {
      addToast('Não há lançamentos conciliados para exportar.', 'error');
      return;
    }

    try {
      const txtContent = generateDominioTxtContent(matches, company, bankAccount);
      const cleanName = (company.name || 'dominio').toLowerCase().replace(/[^a-z0-9]/gi, '_');
      downloadTxtFile(txtContent, `contahub_dominio_${cleanName}_${new Date().toISOString().split('T')[0]}.txt`);
      addToast(`Arquivo TXT Domínio gerado com sucesso! (${matches.length} lançamentos)`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      addToast('Erro ao exportar arquivo TXT.', 'error');
    }
  };

  const handleExportExcel = () => {
    try {
      exportReport(reconciliationResult);
      addToast('Planilha Excel com 5 abas exportada com sucesso!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      addToast('Erro ao exportar planilha Excel.', 'error');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
            <Settings2 size={20} color="var(--accent-cyan)" />
            Exportar para o Domínio Sistemas
          </h3>
          <button onClick={onClose} className="btn-outline btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Company & Stats Capsule */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
              <Building2 size={16} color="var(--accent-cyan)" />
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>EMPRESA ATIVA</span>
                <strong style={{ color: 'var(--text-primary)' }}>{company.name}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
              <Layers size={16} color="var(--accent-teal)" />
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>LOTE CONCILIADO</span>
                <strong style={{ color: 'var(--accent-cyan)' }}>{matches.length} itens ({formatCurrency(totalAmount)})</strong>
              </div>
            </div>
          </div>

          {/* Format Selector */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className={`btn ${exportFormat === 'txt' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setExportFormat('txt')}
              style={{ flex: 1, fontSize: '0.85rem' }}
            >
              <FileText size={14} /> TXT Oficial Domínio (|0000| / |6100|)
            </button>
            <button
              type="button"
              className={`btn ${exportFormat === 'excel' ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => setExportFormat('excel')}
              style={{ flex: 1, fontSize: '0.85rem' }}
            >
              <Download size={14} /> Planilha Excel (5 Abas)
            </button>
          </div>

          {exportFormat === 'txt' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Bank Account Selector */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Landmark size={14} color="var(--accent-cyan)" />
                  Conta Bancária / Caixa Padrão (Contrapartida Financeira):
                </label>
                <select
                  className="form-input"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                >
                  <option value="">-- Selecione a Conta Bancária no Plano (ou digite o código) --</option>
                  {activeAccounts.map(acc => (
                    <option key={acc.code} value={acc.code}>
                      {acc.code} - {acc.name} ({acc.classification || 'Analítica'})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Se preenchida, esta conta será usada como contrapartida (Crédito para saídas / Débito para entradas).
                </span>
              </div>

              {/* Live Preview Table of 6100 Records */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Eye size={14} /> Prévia dos Registros |6100| (Primeiros 5 Lançamentos)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Histórico Enriquecido com Fornecedor / NF</span>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                  <table className="classic-data-table" style={{ fontSize: '0.78rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '75px' }}>Data</th>
                        <th style={{ width: '60px' }}>Débito</th>
                        <th style={{ width: '60px' }}>Crédito</th>
                        <th style={{ width: '90px', textAlign: 'right' }}>Valor (R$)</th>
                        <th style={{ width: '45px' }}>Hist</th>
                        <th>Histórico Formatado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{r.date}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-danger)' }}>{r.debit}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-success)' }}>{r.credit}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(r.value)}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{r.codHist}</td>
                          <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }} title={r.histText}>
                            {r.histText}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Layout Domínio Note */}
              <div style={{ padding: '10px 12px', background: 'var(--accent-glow)', border: '1px solid var(--accent-teal)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--color-success)' }}>
                <strong>Formato Oficial:</strong> <code>|6100|DATA|DEBITO|CREDITO|VALOR|COD_HIST|HISTORICO||||</code> pronto para importação via menu <em>Utilitários &gt; Importação &gt; Importador &gt; Texto</em>.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Gera uma planilha executiva em Excel contendo 5 abas completas de auditoria e conciliação:
              </p>
              <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><strong>Resumo Executivo</strong>: Indicadores e taxa % de conciliação</li>
                <li><strong>Conciliados</strong>: Lançamentos com histórico enriquecido</li>
                <li><strong>Sugestões</strong>: Boletos com acréscimo de juros/descontos</li>
                <li><strong>Ausentes no Banco</strong> / <strong>Ausentes no Fornecedor</strong></li>
              </ul>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Voltar</button>
          {exportFormat === 'txt' ? (
            <button className="btn btn-primary" onClick={handleExportTxt}>
              <FileText size={15} /> Gerar e Baixar TXT Domínio ({matches.length})
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleExportExcel}>
              <Download size={15} /> Gerar e Baixar Planilha Excel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
