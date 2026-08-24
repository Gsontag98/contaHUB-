import { FileSpreadsheet, Download, FileText, CheckCircle2, AlertTriangle, Landmark, Building2, Settings2 } from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { exportReport, exportDominioTxt } from '../../engine/exporter.js';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ReportPage() {
  const { reconciliationResult, openModal, addToast } = useAppStore();

  if (!reconciliationResult) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Nenhuma conciliação executada no momento.</p>
      </div>
    );
  }

  const {
    matches = [],
    suggestions = [],
    missingInBank = [],
    missingInSupplier = [],
    totalBankCount = 0,
    totalSupplierCount = 0,
    reconciledRate = 0
  } = reconciliationResult;

  const handleExportXlsx = () => {
    try {
      exportReport(reconciliationResult);
      addToast('📊 Relatório Excel multi-abas baixado com sucesso!', 'success');
    } catch (err) {
      addToast(`❌ Erro ao exportar Excel: ${err.message}`, 'error');
    }
  };

  const passSummary = {};
  matches.forEach(m => {
    passSummary[m.passName] = (passSummary[m.passName] || 0) + 1;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HEADER & EXPORT ACTIONS */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Relatório e Exportação Domínio Sistemas
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Consolidação de auditoria, histórico enriquecido e geração de arquivos para o Domínio Sistemas
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => openModal('export')}>
            <Settings2 size={18} /> Exportar para o Domínio (TXT / Excel)
          </button>
          <button className="btn btn-secondary" onClick={handleExportXlsx}>
            <FileSpreadsheet size={18} /> Baixar Planilha (.xlsx)
          </button>
        </div>
      </div>

      {/* EXECUTIVE KPI GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>TAXA DE SUCESSO</span>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
            {reconciledRate.toFixed(1)}%
          </p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>VÍNCULOS REALIZADOS</span>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {matches.length}
          </p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--bank-color)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PENDÊNCIAS NO BANCO</span>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--bank-color)', fontFamily: 'var(--font-mono)' }}>
            {missingInBank.length}
          </p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--supplier-color)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PENDÊNCIAS NO FORNECEDOR</span>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--supplier-color)', fontFamily: 'var(--font-mono)' }}>
            {missingInSupplier.length}
          </p>
        </div>
      </div>

      {/* PASS SUMMARY TABLE */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-primary)' }}>
          Detalhamento por Método de Conciliação
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(passSummary).map(([passName, count]) => (
            <div key={passName} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{passName}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {count} vínculos
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
