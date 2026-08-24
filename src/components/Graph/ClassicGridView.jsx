import { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Unlink,
  Landmark,
  Building2,
  FileSpreadsheet,
  Layers
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ClassicGridView() {
  const {
    reconciliationResult,
    searchQuery,
    filterStatus,
    setSelectedMatch,
    removeMatch,
    addToast
  } = useAppStore();

  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [selectedRowId, setSelectedRowId] = useState(null);

  if (!reconciliationResult) return null;

  const { matches = [], suggestions = [], missingInBank = [], missingInSupplier = [] } = reconciliationResult;

  // Flatten all items into unified tabular rows
  const allRows = useMemo(() => {
    const rows = [];

    // 1. Matched rows
    matches.forEach((m, idx) => {
      const b = m.bankItems[0] || {};
      const s = m.supplierItems[0] || {};
      const bAmount = m.bankItems.reduce((acc, cur) => acc + (cur.amount || 0), 0);
      const sAmount = m.supplierItems.reduce((acc, cur) => acc + (cur.amount || 0), 0);
      const diff = Math.abs(bAmount - sAmount);

      rows.push({
        id: m.id,
        matchId: m.id,
        status: 'CONCILIADO',
        confidence: m.confidence,
        passName: m.passName,
        badgeClass: m.badgeClass || 'badge-exact',
        bankDate: b.date || '',
        bankDesc: b.description || '',
        bankDoc: b.document || '',
        bankCnpj: b.cnpj || '',
        bankAmount: bAmount,
        suppDate: s.date || '',
        suppDesc: s.description || (m.supplierItems.length > 1 ? `[${m.supplierItems.length} títulos agrupados]` : ''),
        suppDoc: s.document || '',
        suppCnpj: s.cnpj || '',
        suppAmount: sAmount,
        diff: diff,
        rawMatch: m,
        type: m.type || '1:1'
      });
    });

    // 2. Unmatched Bank rows
    missingInBank.forEach((b, idx) => {
      rows.push({
        id: `un_b_${b.id}`,
        matchId: null,
        status: 'PENDENTE_BANCO',
        confidence: 0,
        passName: 'Pendente Banco',
        badgeClass: 'badge-danger',
        bankDate: b.date || '',
        bankDesc: b.description || '',
        bankDoc: b.document || '',
        bankCnpj: b.cnpj || '',
        bankAmount: b.amount || 0,
        suppDate: '',
        suppDesc: '—',
        suppDoc: '—',
        suppCnpj: '',
        suppAmount: 0,
        diff: b.amount || 0,
        rawBank: b
      });
    });

    // 3. Unmatched Supplier rows
    missingInSupplier.forEach((s, idx) => {
      rows.push({
        id: `un_s_${s.id}`,
        matchId: null,
        status: 'PENDENTE_FORN',
        confidence: 0,
        passName: 'Pendente Fornecedor',
        badgeClass: 'badge-warning',
        bankDate: '',
        bankDesc: '—',
        bankDoc: '—',
        bankCnpj: '',
        bankAmount: 0,
        suppDate: s.date || '',
        suppDesc: s.description || '',
        suppDoc: s.document || '',
        suppCnpj: s.cnpj || '',
        suppAmount: s.amount || 0,
        diff: s.amount || 0,
        rawSupplier: s
      });
    });

    return rows;
  }, [matches, missingInBank, missingInSupplier]);

  // Filter rows by search and status chips
  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      // Status filter
      if (filterStatus === 'exact' && row.confidence !== 100) return false;
      if (filterStatus === 'unmatched_bank' && row.status !== 'PENDENTE_BANCO') return false;
      if (filterStatus === 'unmatched_supplier' && row.status !== 'PENDENTE_FORN') return false;
      if (filterStatus === 'warning' && row.diff === 0) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toUpperCase().trim();
        const fullText = `${row.bankDesc} ${row.bankDoc} ${row.bankCnpj} ${row.bankAmount} ${row.bankDate} ${row.suppDesc} ${row.suppDoc} ${row.suppCnpj} ${row.suppAmount} ${row.passName}`.toUpperCase();
        if (!fullText.includes(q)) return false;
      }

      return true;
    });
  }, [allRows, filterStatus, searchQuery]);

  // Sorting
  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((a, b) => {
      let vA = a[sortField];
      let vB = b[sortField];

      if (typeof vA === 'string') vA = vA.toUpperCase();
      if (typeof vB === 'string') vB = vB.toUpperCase();

      if (vA < vB) return sortDirection === 'asc' ? -1 : 1;
      if (vA > vB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRows, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.4 }} />;
    return sortDirection === 'asc' ? <ArrowUp size={12} color="var(--accent-cyan)" /> : <ArrowDown size={12} color="var(--accent-cyan)" />;
  };

  // Summary calculations for footer
  const totalBank = useMemo(() => sortedRows.reduce((acc, r) => acc + (r.bankAmount || 0), 0), [sortedRows]);
  const totalSupp = useMemo(() => sortedRows.reduce((acc, r) => acc + (r.suppAmount || 0), 0), [sortedRows]);
  const totalDiff = useMemo(() => Math.abs(totalBank - totalSupp), [totalBank, totalSupp]);

  return (
    <div className="classic-grid-container">
      <div className="grid-scroll-area">
        <table className="classic-data-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>#</th>
              <th style={{ width: '130px' }} onClick={() => handleSort('status')} className="sortable">
                <div className="th-content">Status {getSortIcon('status')}</div>
              </th>
              <th style={{ width: '95px' }} onClick={() => handleSort('bankDate')} className="sortable">
                <div className="th-content">Data Bco {getSortIcon('bankDate')}</div>
              </th>
              <th style={{ minWidth: '220px' }} onClick={() => handleSort('bankDesc')} className="sortable">
                <div className="th-content">Histórico Banco {getSortIcon('bankDesc')}</div>
              </th>
              <th style={{ width: '90px' }} onClick={() => handleSort('bankDoc')} className="sortable">
                <div className="th-content">Doc Bco {getSortIcon('bankDoc')}</div>
              </th>
              <th style={{ width: '120px', textAlign: 'right' }} onClick={() => handleSort('bankAmount')} className="sortable">
                <div className="th-content" style={{ justifyContent: 'flex-end' }}>Valor Bco (R$) {getSortIcon('bankAmount')}</div>
              </th>
              <th style={{ width: '95px' }} onClick={() => handleSort('suppDate')} className="sortable">
                <div className="th-content">Data Forn {getSortIcon('suppDate')}</div>
              </th>
              <th style={{ minWidth: '220px' }} onClick={() => handleSort('suppDesc')} className="sortable">
                <div className="th-content">Razão Social / Histórico Forn {getSortIcon('suppDesc')}</div>
              </th>
              <th style={{ width: '90px' }} onClick={() => handleSort('suppDoc')} className="sortable">
                <div className="th-content">Doc Forn {getSortIcon('suppDoc')}</div>
              </th>
              <th style={{ width: '120px', textAlign: 'right' }} onClick={() => handleSort('suppAmount')} className="sortable">
                <div className="th-content" style={{ justifyContent: 'flex-end' }}>Valor Forn (R$) {getSortIcon('suppAmount')}</div>
              </th>
              <th style={{ width: '100px', textAlign: 'right' }} onClick={() => handleSort('diff')} className="sortable">
                <div className="th-content" style={{ justifyContent: 'flex-end' }}>Diff (R$) {getSortIcon('diff')}</div>
              </th>
              <th style={{ minWidth: '180px' }} onClick={() => handleSort('passName')} className="sortable">
                <div className="th-content">Regra / Método {getSortIcon('passName')}</div>
              </th>
              <th style={{ width: '70px', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Nenhum registro encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              sortedRows.map((row, idx) => {
                const isSelected = selectedRowId === row.id;
                const isMatched = row.status === 'CONCILIADO';

                return (
                  <tr
                    key={row.id}
                    className={`${isSelected ? 'selected' : ''} ${isMatched ? 'row-matched' : 'row-unmatched'}`}
                    onClick={() => setSelectedRowId(row.id)}
                    onDoubleClick={() => row.rawMatch && setSelectedMatch(row.rawMatch)}
                  >
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {idx + 1}
                    </td>

                    <td>
                      {isMatched ? (
                        <span className="badge badge-exact" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                          <CheckCircle2 size={11} /> {row.confidence}%
                        </span>
                      ) : row.status === 'PENDENTE_BANCO' ? (
                        <span className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                          Bco Pendente
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                          Forn Pendente
                        </span>
                      )}
                    </td>

                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {row.bankDate ? row.bankDate.split('-').reverse().join('/') : '—'}
                    </td>

                    <td title={row.bankDesc} style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {row.bankDesc}
                    </td>

                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {row.bankDoc || '—'}
                    </td>

                    <td className="grid-cell-money" style={{ color: row.bankAmount > 0 ? 'var(--bank-color)' : 'var(--text-muted)' }}>
                      {row.bankAmount > 0 ? formatCurrency(row.bankAmount) : '—'}
                    </td>

                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {row.suppDate ? row.suppDate.split('-').reverse().join('/') : '—'}
                    </td>

                    <td title={row.suppDesc} style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {row.suppDesc}
                    </td>

                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {row.suppDoc || '—'}
                    </td>

                    <td className="grid-cell-money" style={{ color: row.suppAmount > 0 ? 'var(--supplier-color)' : 'var(--text-muted)' }}>
                      {row.suppAmount > 0 ? formatCurrency(row.suppAmount) : '—'}
                    </td>

                    <td className="grid-cell-money" style={{ color: row.diff > 0 ? 'var(--color-warning)' : 'var(--color-success)', fontWeight: 700 }}>
                      {formatCurrency(row.diff)}
                    </td>

                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span title={row.passName} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '220px' }}>
                        {row.passName}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {row.rawMatch ? (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 6px' }}
                            onClick={(e) => { e.stopPropagation(); setSelectedMatch(row.rawMatch); }}
                            title="Auditar Detalhes"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '3px 6px' }}
                            onClick={(e) => { e.stopPropagation(); removeMatch(row.matchId); }}
                            title="Desvincular"
                          >
                            <Unlink size={12} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* STICKY FOOTER SUMMARY (DEVEXPRESS STYLE) */}
      <div className="classic-grid-footer">
        <div className="footer-metric">
          <span className="footer-label">TOTAL REGISTROS:</span>
          <span className="footer-val">{sortedRows.length} linhas</span>
        </div>
        <div className="footer-metric">
          <span className="footer-label">TOTAL BANCO:</span>
          <span className="footer-val" style={{ color: 'var(--bank-color)' }}>{formatCurrency(totalBank)}</span>
        </div>
        <div className="footer-metric">
          <span className="footer-label">TOTAL FORNECEDOR:</span>
          <span className="footer-val" style={{ color: 'var(--supplier-color)' }}>{formatCurrency(totalSupp)}</span>
        </div>
        <div className="footer-metric">
          <span className="footer-label">DIFERENÇA LÍQUIDA:</span>
          <span className="footer-val" style={{ color: totalDiff === 0 ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {formatCurrency(totalDiff)}
          </span>
        </div>
        <div className="footer-metric" style={{ marginLeft: 'auto' }}>
          <span className="footer-label">TAXA CONCILIAÇÃO:</span>
          <span className="footer-val" style={{ color: 'var(--color-success)' }}>
            {reconciliationResult.reconciledRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
