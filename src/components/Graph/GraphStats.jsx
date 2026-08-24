import { CheckCircle2, Clock, Landmark, Building2, Percent } from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';

export default function GraphStats() {
  const { reconciliationResult } = useAppStore();

  if (!reconciliationResult) return null;

  const {
    matches = [],
    suggestions = [],
    missingInBank = [],
    missingInSupplier = [],
    totalBankCount = 0,
    totalSupplierCount = 0,
    reconciledRate = 0
  } = reconciliationResult;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          <Percent size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-label">Taxa de Conciliação</span>
          <span className="stat-value" style={{ color: 'var(--color-success)' }}>
            {reconciledRate.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent-cyan)' }}>
          <CheckCircle2 size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-label">Lançamentos Conciliados</span>
          <span className="stat-value">{matches.length}</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: 'var(--bank-bg)', color: 'var(--bank-color)' }}>
          <Landmark size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-label">Pendentes no Banco</span>
          <span className="stat-value">{missingInBank.length}</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: 'var(--supplier-bg)', color: 'var(--supplier-color)' }}>
          <Building2 size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-label">Pendentes no Fornecedor</span>
          <span className="stat-value">{missingInSupplier.length}</span>
        </div>
      </div>
    </div>
  );
}
