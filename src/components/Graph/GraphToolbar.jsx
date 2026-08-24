import React from 'react';
import { Table, LayoutGrid, Network, Search, X, Filter, FileSpreadsheet, ArrowRight } from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';

export default function GraphToolbar() {
  const {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    reconciliationResult,
    sendReconciliationToTransactions
  } = useAppStore();

  const { matches = [], suggestions = [], missingInBank = [], missingInSupplier = [] } = reconciliationResult || {};
  const totalCount = matches.length + missingInBank.length + missingInSupplier.length;
  const exactCount = matches.filter(m => m.confidence === 100).length;

  return (
    <div className="toolbar-card">
      {/* TOP ROW: Search Input + View Mode Switcher */}
      <div className="toolbar-top-row">
        <div className="toolbar-search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input toolbar-search-input"
            placeholder="Buscar por histórico, CNPJ, valor (R$), data ou documento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="clear-search-btn" 
              onClick={() => setSearchQuery('')}
              title="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="view-mode-toggle">
          <button
            className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Visão Didática em 2 Colunas Lado a Lado"
          >
            <Table size={15} />
            <span>Tabela Didática</span>
          </button>

          <button
            className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid Contábil Completo (estilo cxGrid / DevExpress)"
          >
            <LayoutGrid size={15} />
            <span>Grid Clássico</span>
          </button>

          <button
            className={`view-mode-btn ${viewMode === 'graph' ? 'active' : ''}`}
            onClick={() => setViewMode('graph')}
            title="Grafo Bipartido Interativo com Nós e Arestas"
          >
            <Network size={15} />
            <span>Grafo Visual</span>
          </button>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => sendReconciliationToTransactions()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontWeight: 700, whiteSpace: 'nowrap' }}
          title="Enviar todos os lançamentos com histórico de fornecedores para a Tabela De-Para"
        >
          <FileSpreadsheet size={16} />
          <span>Enviar para De-Para ({matches.length + missingInBank.length})</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* BOTTOM ROW: Filters */}
      <div className="toolbar-filters-row">
        <div className="filters-label">
          <Filter size={14} color="var(--accent-teal)" />
          <span>Filtrar:</span>
        </div>

        <div className="filter-chips">
          <button
            className={`chip-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            Todos <span className="chip-count">({totalCount})</span>
          </button>

          <button
            className={`chip-btn ${filterStatus === 'exact' ? 'active' : ''}`}
            onClick={() => setFilterStatus('exact')}
          >
            100% Exatos <span className="chip-count">({exactCount})</span>
          </button>

          {suggestions.length > 0 && (
            <button
              className={`chip-btn chip-warning ${filterStatus === 'warning' ? 'active' : ''}`}
              onClick={() => setFilterStatus('warning')}
            >
              Juros / Descontos <span className="chip-count">({suggestions.length})</span>
            </button>
          )}

          <button
            className={`chip-btn ${filterStatus === 'unmatched_bank' ? 'active' : ''}`}
            onClick={() => setFilterStatus('unmatched_bank')}
          >
            Pendentes Banco <span className="chip-count">({missingInBank.length})</span>
          </button>

          <button
            className={`chip-btn ${filterStatus === 'unmatched_supplier' ? 'active' : ''}`}
            onClick={() => setFilterStatus('unmatched_supplier')}
          >
            Pendentes Fornecedor <span className="chip-count">({missingInSupplier.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
