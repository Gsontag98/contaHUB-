import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Download,
  Trash2,
  RefreshCw,
  Landmark,
  Building2,
  Calendar,
  Check,
  X,
  Plus,
  ArrowRight,
  Receipt,
  FileSpreadsheet,
  Link,
  Unlink,
  Eye
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { 
  parseMultipleXmlFiles, 
  exportFiscalLedgerToExcel 
} from '../../engine/xmlRepository.js';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

function formatCNPJ(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }
  if (digits.length !== 14) return value;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

const MONTH_NAMES = [
  { value: 'all', label: 'Todos os Meses (Ano Todo)' },
  { value: '01', label: '01 - Janeiro' },
  { value: '02', label: '02 - Fevereiro' },
  { value: '03', label: '03 - Março' },
  { value: '04', label: '04 - Abril' },
  { value: '05', label: '05 - Maio' },
  { value: '06', label: '06 - Junho' },
  { value: '07', label: '07 - Julho' },
  { value: '08', label: '08 - Agosto' },
  { value: '09', label: '09 - Setembro' },
  { value: '10', label: '10 - Outubro' },
  { value: '11', label: '11 - Novembro' },
  { value: '12', label: '12 - Dezembro' }
];

export default function FiscalControlPanel() {
  const {
    fiscalInvoices,
    addFiscalInvoices,
    deleteFiscalInvoice,
    clearFiscalInvoices,
    settleFiscalInstallment,
    unsettleFiscalInstallment,
    activeCompany,
    setActivePage,
    setSupplierFile,
    addToast
  } = useAppStore();

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'ENTRADA', 'SAIDA', 'SERVICO_TOMADO', 'SERVICO_PRESTADO'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'ABERTO', 'PARCIAL', 'LIQUIDADO'
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Manual settlement modal state
  const [manualModalInvoice, setManualModalInvoice] = useState(null);
  const [manualModalInstallment, setManualModalInstallment] = useState(null);
  const [manualSettleDate, setManualSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualSettleDesc, setManualSettleDesc] = useState('');

  const todayIso = new Date().toISOString().split('T')[0];

  // KPIs Computation
  const kpis = useMemo(() => {
    const totalDocs = fiscalInvoices.length;
    const totalAmount = fiscalInvoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
    const paidAmount = fiscalInvoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
    const remainingAmount = fiscalInvoices.reduce((acc, i) => acc + (i.remainingAmount || 0), 0);

    let overdueInstallmentsCount = 0;
    fiscalInvoices.forEach(inv => {
      inv.installments.forEach(inst => {
        if (inst.status === 'ABERTO' && inst.dueDate && inst.dueDate < todayIso) {
          overdueInstallmentsCount++;
        }
      });
    });

    const settledCount = fiscalInvoices.filter(i => i.status === 'LIQUIDADO').length;
    const partialCount = fiscalInvoices.filter(i => i.status === 'PARCIAL').length;
    const openCount = fiscalInvoices.filter(i => i.status === 'ABERTO').length;

    return {
      totalDocs,
      totalAmount,
      paidAmount,
      remainingAmount,
      overdueInstallmentsCount,
      settledCount,
      partialCount,
      openCount
    };
  }, [fiscalInvoices, todayIso]);

  // Handle Multi-XML Files Upload
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      const xmlFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.xml'));
      if (xmlFiles.length === 0) {
        addToast('Nenhum arquivo .xml válido encontrado na seleção.', 'warning');
        return;
      }

      const parsedInvoices = await parseMultipleXmlFiles(xmlFiles, activeCompany?.cnpj || '');
      if (parsedInvoices.length === 0) {
        addToast('Não foi possível extrair dados válidos dos arquivos XML selecionados.', 'error');
        return;
      }

      addFiscalInvoices(parsedInvoices);
    } catch (err) {
      console.error(err);
      addToast(`Erro ao processar XMLs: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
      setIsDragOver(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Toggle Accordion Expansion
  const toggleExpand = (invoiceId) => {
    setExpandedInvoiceIds(prev => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedInvoiceIds(new Set(fiscalInvoices.map(i => i.id)));
  };

  const collapseAll = () => {
    setExpandedInvoiceIds(new Set());
  };

  // Filter & Search Logic
  const filteredInvoices = useMemo(() => {
    return fiscalInvoices.filter(inv => {
      // Month filter (checks issueDate or any installment dueDate)
      if (selectedMonth !== 'all') {
        const invMonth = (inv.issueDate || '').split('-')[1];
        const hasInstMonth = inv.installments.some(inst => (inst.dueDate || '').split('-')[1] === selectedMonth);
        if (invMonth !== selectedMonth && !hasInstMonth) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && inv.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = String(inv.number || '').toLowerCase().includes(q);
        const nameMatch = (inv.partnerName || '').toLowerCase().includes(q);
        const cnpjMatch = (inv.partnerCnpj || '').includes(q);
        const valMatch = String(inv.totalAmount || '').includes(q);
        const instDocMatch = inv.installments.some(inst => 
          String(inst.bankDescription || '').toLowerCase().includes(q) ||
          String(inst.amount || '').includes(q)
        );
        return numMatch || nameMatch || cnpjMatch || valMatch || instDocMatch;
      }

      return true;
    });
  }, [fiscalInvoices, selectedMonth, typeFilter, statusFilter, searchQuery]);

  // Push open installments to Reconciliation Engine
  const handlePushToReconciliation = () => {
    if (fiscalInvoices.length === 0) {
      addToast('Importe XMLs antes de enviar para a conciliação.', 'warning');
      return;
    }

    const openItems = [];
    fiscalInvoices.forEach(inv => {
      inv.installments.forEach(inst => {
        if (inst.status === 'ABERTO') {
          openItems.push({
            id: inst.id,
            fiscalInvoiceId: inv.id,
            installmentNumber: inst.number,
            installmentLabel: inst.label,
            date: inst.dueDate || inv.issueDate,
            description: `${inv.partnerName}${inst.label ? ` (Parc ${inst.label})` : ''}`,
            favorecido: inv.partnerName,
            razaoSocial: inv.partnerName,
            document: inv.number,
            cnpj: inv.partnerCnpj,
            amount: inst.amount,
            isDebit: inv.type === 'ENTRADA' || inv.type === 'SERVICO_TOMADO',
            isIncome: inv.type === 'SAIDA' || inv.type === 'SERVICO_PRESTADO',
            invoiceType: inv.type
          });
        }
      });
    });

    if (openItems.length === 0) {
      addToast('Todas as notas fiscais do período já estão 100% quitadas!', 'info');
      return;
    }

    // Load into supplier/ledger items in the app store
    useAppStore.setState({
      supplierItems: openItems,
      supplierFile: { name: `XML_Fiscal_${activeCompany?.name || 'Empresa'} (${openItems.length} parcelas)` },
      activePage: 'upload'
    });

    addToast(`🚀 ${openItems.length} parcelas em aberto carregadas na Conciliação Bancária!`, 'success');
  };

  // Open manual settlement modal
  const openManualModal = (inv, inst) => {
    setManualModalInvoice(inv);
    setManualModalInstallment(inst);
    setManualSettleDate(inst.dueDate || new Date().toISOString().split('T')[0]);
    setManualSettleDesc(`Pagamento Manual NF ${inv.number} Parc ${inst.label}`);
  };

  const handleConfirmManualSettle = () => {
    if (!manualModalInvoice || !manualModalInstallment) return;
    settleFiscalInstallment(manualModalInvoice.id, manualModalInstallment.number, {
      date: manualSettleDate,
      amount: manualModalInstallment.amount,
      bankTxId: `manual_settle_${Date.now()}`,
      bankDescription: manualSettleDesc || 'Pagamento Manual Confirmado'
    });
    setManualModalInvoice(null);
    setManualModalInstallment(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--accent-glow)', color: 'var(--accent-cyan)' }}>
              <Receipt size={26} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                Controle Fiscal de Notas & Parcelas (Multi-Período)
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Empresa: <strong>{activeCompany?.name}</strong> • Repositório Anual de Compras, Vendas e Serviços
              </span>
            </div>
          </div>

          {/* Action Buttons Top */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".xml" 
              multiple 
              onChange={(e) => handleFiles(e.target.files)} 
              style={{ display: 'none' }} 
            />
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <UploadCloud size={16} /> Importar XMLs
            </button>

            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handlePushToReconciliation}
              title="Enviar parcelas abertas para cruzar com o Extrato Bancário"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)' }}
            >
              <Sparkles size={15} /> Cruzar com Extrato
            </button>

            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => exportFiscalLedgerToExcel(fiscalInvoices, activeCompany?.name)}
              disabled={fiscalInvoices.length === 0}
              title="Baixar Planilha Excel com todas as Notas e Parcelas"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={15} /> Excel
            </button>

            {fiscalInvoices.length > 0 && (
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => {
                  if (window.confirm('Deseja realmente esvaziar o repositório de XMLs desta empresa?')) {
                    clearFiscalInvoices();
                  }
                }}
                title="Limpar todos os XMLs importados"
              >
                <Trash2 size={15} /> Limpar
              </button>
            )}
          </div>
        </div>

        {/* KPI Dashboard Capsules */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total de Documentos</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px' }}>
              {kpis.totalDocs} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>notas fiscais</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Faturado / Emitido</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatCurrency(kpis.totalAmount)}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.35)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', textTransform: 'uppercase', fontWeight: 700 }}>Total Pago / Liquidado</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-success)', marginTop: '2px' }}>
              {formatCurrency(kpis.paidAmount)}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.35)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', textTransform: 'uppercase', fontWeight: 700 }}>Saldo em Aberto (A Pagar/Receber)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-warning)', marginTop: '2px' }}>
              {formatCurrency(kpis.remainingAmount)}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.35)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)', textTransform: 'uppercase', fontWeight: 700 }}>Parcelas Vencidas</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-danger)', marginTop: '2px' }}>
              {kpis.overdueInstallmentsCount}
            </div>
          </div>
        </div>
      </div>

      {/* Empty State Drag & Drop Zone */}
      {fiscalInvoices.length === 0 ? (
        <div className="card" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '750px', margin: '20px auto', width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '6px' }}>Importar XMLs de Notas Fiscais</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
              Carregue os arquivos XML de NF-e (Entrada e Saída), NFS-e ou CT-e do ano inteiro da empresa <strong>{activeCompany?.name}</strong>.
            </p>
          </div>

          <label
            className={`upload-dropzone-box ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--accent-cyan)',
              borderRadius: '16px',
              padding: '40px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragOver ? 'rgba(45, 212, 191, 0.12)' : 'rgba(45, 212, 191, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{ padding: '12px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent-cyan)' }}>
              <UploadCloud size={38} />
            </div>
            <div>
              <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '1rem' }}>
                {isUploading ? 'Processando XMLs...' : 'Clique para selecionar ou arraste dezenas de XMLs aqui'}
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Suporta NF-e (Compras e Vendas), NFS-e (Serviços) e CT-e com leitura automática de parcelas
            </span>
          </label>
        </div>
      ) : (
        <>
          {/* Filter & Toolbar */}
          <div className="toolbar-card" style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              {/* Search Box */}
              <div className="panel-search-box" style={{ maxWidth: '380px', height: '36px' }}>
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="form-input panel-search-input"
                  placeholder="Buscar por NF, fornecedor, CNPJ, valor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ height: '34px', fontSize: '0.82rem' }}
                />
                {searchQuery && (
                  <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Month Dropdown Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={15} color="var(--accent-cyan)" />
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Mês:</label>
                <select
                  className="form-input"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ width: '190px', height: '34px', minHeight: '34px', padding: '4px 8px', fontSize: '0.82rem', margin: 0 }}
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Tipo:</label>
                <select
                  className="form-input"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{ width: '170px', height: '34px', minHeight: '34px', padding: '4px 8px', fontSize: '0.82rem', margin: 0 }}
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="ENTRADA">Compras (Entrada)</option>
                  <option value="SAIDA">Vendas (Saída)</option>
                  <option value="SERVICO_TOMADO">Serviços Tomados</option>
                  <option value="SERVICO_PRESTADO">Serviços Prestados</option>
                  <option value="CTE_FRETE">Fretes (CT-e)</option>
                </select>
              </div>

              {/* Status Filter Chips */}
              <div className="filter-chips">
                <button className={`chip-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
                  Todas ({kpis.totalDocs})
                </button>
                <button className={`chip-btn ${statusFilter === 'ABERTO' ? 'active' : ''}`} onClick={() => setStatusFilter('ABERTO')} style={{ color: 'var(--color-warning)' }}>
                  Aberto ({kpis.openCount})
                </button>
                <button className={`chip-btn ${statusFilter === 'PARCIAL' ? 'active' : ''}`} onClick={() => setStatusFilter('PARCIAL')} style={{ color: 'var(--accent-cyan)' }}>
                  Parcial ({kpis.partialCount})
                </button>
                <button className={`chip-btn ${statusFilter === 'LIQUIDADO' ? 'active' : ''}`} onClick={() => setStatusFilter('LIQUIDADO')} style={{ color: 'var(--color-success)' }}>
                  Liquidado ({kpis.settledCount})
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary btn-sm" onClick={expandAll} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                  Expandir Tudo
                </button>
                <button className="btn btn-secondary btn-sm" onClick={collapseAll} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                  Recolher
                </button>
              </div>
            </div>
          </div>

          {/* Accordion Table */}
          <div className="card" style={{ padding: '0', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
            <table className="classic-data-table" style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '38px', textAlign: 'center' }}></th>
                  <th style={{ width: '110px' }}>Tipo</th>
                  <th style={{ width: '100px' }}>Número / Série</th>
                  <th style={{ width: '90px' }}>Emissão</th>
                  <th>Fornecedor / Cliente</th>
                  <th style={{ width: '130px' }}>CNPJ</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Valor Total</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Quitação</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '50px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Nenhuma nota fiscal encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isExpanded = expandedInvoiceIds.has(inv.id);
                    const paidInstallments = inv.installments.filter(i => i.status === 'PAGO').length;
                    const totalInstallments = inv.installments.length;

                    return (
                      <React.Fragment key={inv.id}>
                        {/* Master Row */}
                        <tr 
                          onClick={() => toggleExpand(inv.id)} 
                          style={{ cursor: 'pointer', background: isExpanded ? 'rgba(45, 212, 191, 0.04)' : undefined }}
                        >
                          <td style={{ textAlign: 'center', color: 'var(--accent-cyan)' }}>
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </td>
                          <td>
                            {inv.type === 'ENTRADA' && (
                              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                                Compra (Entrada)
                              </span>
                            )}
                            {inv.type === 'SAIDA' && (
                              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                Venda (Saída)
                              </span>
                            )}
                            {(inv.type === 'SERVICO_TOMADO' || inv.type === 'SERVICO_PRESTADO') && (
                              <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
                                NFS-e Serviço
                              </span>
                            )}
                            {inv.type === 'CTE_FRETE' && (
                              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                                CT-e Frete
                              </span>
                            )}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            NF {inv.number} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/ {inv.series}</span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {inv.issueDate?.split('-').reverse().join('/')}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{inv.partnerName}</strong>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                            {formatCNPJ(inv.partnerCnpj)}
                          </td>
                          <td className="grid-cell-money" style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                            {formatCurrency(inv.totalAmount)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: paidInstallments === totalInstallments ? 'var(--color-success)' : (paidInstallments > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)') }}>
                                {paidInstallments}/{totalInstallments} pagas
                              </span>
                              <div style={{ width: '75px', height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${(paidInstallments / totalInstallments) * 100}%`, height: '100%', background: paidInstallments === totalInstallments ? 'var(--color-success)' : 'var(--accent-cyan)' }}></div>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {inv.status === 'LIQUIDADO' && (
                              <span className="badge badge-exact" style={{ fontSize: '0.7rem' }}>Liquidada</span>
                            )}
                            {inv.status === 'PARCIAL' && (
                              <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Parcial</span>
                            )}
                            {inv.status === 'ABERTO' && (
                              <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)' }}>Em Aberto</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className="card-action-btn delete-btn"
                              onClick={() => {
                                if (window.confirm(`Excluir a nota fiscal ${inv.number} do repositório?`)) {
                                  deleteFiscalInvoice(inv.id);
                                }
                              }}
                              title="Excluir Nota Fiscal"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Installments Details */}
                        {isExpanded && (
                          <tr style={{ background: 'rgba(0, 0, 0, 0.25)' }}>
                            <td colSpan={10} style={{ padding: '12px 24px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Receipt size={14} /> Detalhamento de Parcelas & Quitação Bancária (NF {inv.number})
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    Chave: {inv.chNFe || 'N/A'}
                                  </span>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', background: 'var(--bg-surface)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                                  <thead>
                                    <tr style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                                      <th style={{ padding: '8px 12px', width: '80px' }}>Parcela</th>
                                      <th style={{ padding: '8px 12px', width: '110px' }}>Vencimento</th>
                                      <th style={{ padding: '8px 12px', width: '120px', textAlign: 'right' }}>Valor Parcela</th>
                                      <th style={{ padding: '8px 12px', width: '120px', textAlign: 'center' }}>Status</th>
                                      <th style={{ padding: '8px 12px', width: '110px' }}>Data Baixa</th>
                                      <th style={{ padding: '8px 12px' }}>Lançamento Bancário Vinculado</th>
                                      <th style={{ padding: '8px 12px', width: '120px', textAlign: 'center' }}>Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {inv.installments.map((inst) => {
                                      const isOverdue = inst.status === 'ABERTO' && inst.dueDate && inst.dueDate < todayIso;

                                      return (
                                        <tr key={inst.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                            {inst.label || `#${inst.number}`}
                                          </td>
                                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>
                                            <span style={{ color: isOverdue ? 'var(--color-danger)' : 'inherit', fontWeight: isOverdue ? 700 : 'normal' }}>
                                              {inst.dueDate?.split('-').reverse().join('/')}
                                            </span>
                                            {isOverdue && (
                                              <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)', marginLeft: '4px' }}>
                                                (Vencida)
                                              </span>
                                            )}
                                          </td>
                                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                            {formatCurrency(inst.amount)}
                                          </td>
                                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                            {inst.status === 'PAGO' ? (
                                              <span className="badge badge-exact" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                                Quitada
                                              </span>
                                            ) : (
                                              <span className="badge" style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                                                A Pagar
                                              </span>
                                            )}
                                          </td>
                                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {inst.settlementDate ? inst.settlementDate.split('-').reverse().join('/') : '—'}
                                          </td>
                                          <td style={{ padding: '8px 12px', color: inst.bankDescription ? 'var(--accent-teal)' : 'var(--text-muted)' }}>
                                            {inst.bankDescription || 'Nenhum lançamento vinculado'}
                                          </td>
                                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                            {inst.status === 'PAGO' ? (
                                              <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => unsettleFiscalInstallment(inv.id, inst.number)}
                                                style={{ fontSize: '0.68rem', padding: '3px 8px', color: 'var(--color-warning)' }}
                                                title="Reabrir Parcela como Pendente"
                                              >
                                                <Unlink size={12} /> Reabrir
                                              </button>
                                            ) : (
                                              <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => openManualModal(inv, inst)}
                                                style={{ fontSize: '0.68rem', padding: '3px 8px', color: 'var(--accent-cyan)' }}
                                                title="Baixar Parcela Manualmente"
                                              >
                                                <Check size={12} /> Baixar
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Manual Settlement Modal */}
      {manualModalInvoice && manualModalInstallment && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="var(--accent-cyan)" />
                Baixar Parcela Manualmente (NF {manualModalInvoice.number})
              </h3>
              <button onClick={() => { setManualModalInvoice(null); setManualModalInstallment(null); }} className="btn-outline btn-sm" style={{ padding: '4px 8px' }}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  <strong>Fornecedor:</strong> {manualModalInvoice.partnerName}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Parcela: <strong>{manualModalInstallment.label}</strong></span>
                  <span>Valor: <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(manualModalInstallment.amount)}</strong></span>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Data do Pagamento:</label>
                <input
                  type="date"
                  className="form-input"
                  value={manualSettleDate}
                  onChange={(e) => setManualSettleDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Identificação / Histórico da Baixa:</label>
                <input
                  type="text"
                  className="form-input"
                  value={manualSettleDesc}
                  onChange={(e) => setManualSettleDesc(e.target.value)}
                  placeholder="Ex: Pagamento Pix pelo Itaú"
                />
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setManualModalInvoice(null); setManualModalInstallment(null); }}>
                Cancelar
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleConfirmManualSettle} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                <Check size={14} /> Confirmar Quitação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
