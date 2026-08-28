import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Check, 
  AlertCircle, 
  Save, 
  Plus, 
  Sparkles, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Trash2, 
  Download, 
  FileSpreadsheet, 
  Landmark, 
  Building2, 
  Search, 
  Layers, 
  ArrowRight,
  FileText,
  Settings,
  UploadCloud,
  HelpCircle,
  Upload,
  RefreshCw,
  FolderOpen,
  Tag,
  DollarSign,
  BookOpen,
  Database,
  Wand2,
  Eraser,
  CheckCircle2
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { 
  suggestPattern, 
  matchTransactionRule, 
  tokenizeDescription, 
  cleanJunkNumbers, 
  generateLogicalFormula,
  evaluateRule
} from '../../engine/rulesEngine.js';
import { parseFile } from '../../engine/parser.js';
import { autoDetect, normalizeItems } from '../../engine/mapper.js';
import MappingModal from './MappingModal.jsx';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ConciliationTable() {
  const {
    transactions,
    setTransactions,
    updateTransaction,
    deleteTransaction,
    deParaRules,
    addDeParaRule,
    planosList,
    activePlanoId,
    activeCompany,
    openModal,
    addToast
  } = useAppStore();

  const fileInputRef = useRef(null);
  const topFileInputRef = useRef(null);

  const [defaultCounterpart, setDefaultCounterpart] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'mapped', 'suggested'
  const [valueFilter, setValueFilter] = useState('all'); // 'all', 'negative', 'positive'
  const [searchQuery, setSearchQuery] = useState('');
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [columnMapping, setColumnMapping] = useState({ date: 'Data', description: ['Descrição'], value: 'Valor' });
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Active autocomplete state in table
  const [activeCell, setActiveCell] = useState(null);
  const [autoSearch, setAutoSearch] = useState('');

  // Quick rule modal overlay state (Domínio-Inspired Visual Builder)
  const [quickRuleTx, setQuickRuleTx] = useState(null);
  const [quickRuleName, setQuickRuleName] = useState('');
  const [quickRuleMustAll, setQuickRuleMustAll] = useState([]);
  const [quickRuleMayAny, setQuickRuleMayAny] = useState([]);
  const [quickRuleMustNot, setQuickRuleMustNot] = useState([]);
  const [quickRuleMatchMode, setQuickRuleMatchMode] = useState('contains');
  const [quickRuleCustomInput, setQuickRuleCustomInput] = useState('');
  const [quickRuleValueType, setQuickRuleValueType] = useState('any');
  const [quickRuleExactValue, setQuickRuleExactValue] = useState('');
  const [quickRuleMinValue, setQuickRuleMinValue] = useState('');
  const [quickRuleMaxValue, setQuickRuleMaxValue] = useState('');
  const [quickRuleSignalCondition, setQuickRuleSignalCondition] = useState('any');
  const [quickRuleType, setQuickRuleType] = useState('dynamic');
  const [quickRuleTargetAccount, setQuickRuleTargetAccount] = useState('');
  const [quickRuleDebit, setQuickRuleDebit] = useState('');
  const [quickRuleCredit, setQuickRuleCredit] = useState('');
  const [quickRuleHistCode, setQuickRuleHistCode] = useState('');
  const [quickRuleHistText, setQuickRuleHistText] = useState('');

  // Extract non-synthetic accounts from active chart of accounts
  const planoContas = useMemo(() => {
    const plan = planosList.find(p => p.id === activePlanoId) || planosList[0];
    if (!plan || !plan.accounts) return [];
    return plan.accounts.filter(acc => !acc.isSynthetic);
  }, [planosList, activePlanoId]);

  // Autocomplete suggestions for table and quick rule
  const autocompleteSuggestions = useMemo(() => {
    if (!autoSearch || planoContas.length === 0) return [];
    const upper = autoSearch.toUpperCase();
    return planoContas.filter(acc => 
      acc.code.includes(upper) || 
      acc.name.toUpperCase().includes(upper) ||
      (acc.classification && acc.classification.includes(upper))
    ).slice(0, 8);
  }, [planoContas, autoSearch]);

  const selectSuggestion = (txIndex, field, code) => {
    updateTransaction(txIndex, { [field]: code, isSuggested: false });
    setActiveCell(null);
    setAutoSearch('');
  };

  // Direct File Parsing and Rule Application for De-Para
  const processSpreadsheetFile = async (file) => {
    if (!file) return;
    setIsLoadingFile(true);

    try {
      const parsed = await parseFile(file);
      if (!parsed.headers || parsed.headers.length === 0 || !parsed.rows || parsed.rows.length === 0) {
        throw new Error('Nenhuma linha de dados encontrada no arquivo.');
      }

      const mapping = autoDetect(parsed.headers);
      const items = normalizeItems(parsed.headers, parsed.rows, mapping, 'depara');

      if (items.length === 0) {
        throw new Error('Não foi possível identificar lançamentos válidos com as colunas detectadas.');
      }

      // Convert items to De-Para transactions with rule matching
      const mappedTransactions = items.map((item, idx) => {
        const numVal = item.debit > 0 ? -item.debit : (item.credit > 0 ? item.credit : (item.isDebit ? -item.amount : item.amount));
        const desc = item.description || 'Lançamento';
        
        const ruleMatch = matchTransactionRule(
          desc, 
          numVal, 
          deParaRules, 
          defaultCounterpart, 
          desc, 
          [item.date, desc, numVal]
        );

        return {
          id: item.id || `tx_direct_${idx}_${Date.now()}`,
          date: item.date || '',
          description: desc,
          originalDescription: desc,
          supplierName: '',
          document: item.document || '',
          value: numVal,
          amount: Math.abs(numVal),
          debitAccount: (ruleMatch && ruleMatch.debitAccount) || (item.debit > 0 ? '' : ''),
          creditAccount: (ruleMatch && ruleMatch.creditAccount) || (item.credit > 0 ? '' : ''),
          historicCode: (ruleMatch && ruleMatch.historicCode) || '',
          historicText: (ruleMatch && ruleMatch.historicText) || desc,
          isSuggested: !!ruleMatch,
          rawRow: item.rawRow
        };
      });

      setTransactions(mappedTransactions);
      addToast(`✅ ${mappedTransactions.length} lançamentos carregados com sucesso de ${file.name}!`, 'success');
    } catch (err) {
      console.error(err);
      addToast(`❌ Erro ao ler planilha: ${err.message}`, 'error');
    } finally {
      setIsLoadingFile(false);
      setIsDragOver(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (topFileInputRef.current) topFileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processSpreadsheetFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processSpreadsheetFile(file);
  };

  // Reapply default counterpart
  const handleDefaultCounterpartChange = (newCounterpart) => {
    setDefaultCounterpart(newCounterpart);
    if (!newCounterpart) return;

    const updated = transactions.map(tx => {
      const isIncome = Number(tx.value || 0) > 0;
      let debit = tx.debitAccount || '';
      let credit = tx.creditAccount || '';

      if (debit && !credit) {
        credit = newCounterpart;
      } else if (!debit && credit) {
        debit = newCounterpart;
      } else if (!debit && !credit) {
        // Aplica APENAS a conta do Banco/Caixa no lado correto (Entrada = Débito no Banco, Saída = Crédito no Banco)
        // O outro lado (despesa/receita/fornecedor) permanece em branco até que uma regra ou o usuário preencha.
        if (isIncome) {
          debit = newCounterpart;
          credit = '';
        } else {
          debit = '';
          credit = newCounterpart;
        }
      }

      return {
        ...tx,
        debitAccount: debit,
        creditAccount: credit,
        isSuggested: true
      };
    });

    setTransactions(updated);
    addToast(`Contrapartida padrão ${newCounterpart} aplicada aos lançamentos!`, 'info');
  };

  const startQuickRule = (tx) => {
    const tokens = tokenizeDescription(tx.description);
    const isDeb = tx.value < 0;
    const numVal = Math.abs(tx.value || 0);

    setQuickRuleTx(tx);
    setQuickRuleName(tokens.slice(0, 3).join(' ') || tx.description);
    setQuickRuleMustAll(tokens.slice(0, 2));
    setQuickRuleMayAny([]);
    setQuickRuleMustNot([]);
    setQuickRuleMatchMode('contains');
    setQuickRuleCustomInput('');
    setQuickRuleValueType('any');
    setQuickRuleExactValue(numVal ? String(numVal.toFixed(2)) : '');
    setQuickRuleMinValue('');
    setQuickRuleMaxValue('');
    setQuickRuleSignalCondition(isDeb ? 'debit_only' : 'credit_only');
    setQuickRuleType('dynamic');
    setQuickRuleTargetAccount(isDeb ? (tx.debitAccount || '') : (tx.creditAccount || ''));
    setQuickRuleDebit(tx.debitAccount || '');
    setQuickRuleCredit(tx.creditAccount || '');
    setQuickRuleHistCode('');
    setQuickRuleHistText('');
  };

  const addQuickRuleTerm = (term, group) => {
    if (!term) return;
    const clean = term.trim().toUpperCase();
    if (!clean) return;
    if (group === 'mustAll') {
      setQuickRuleMustAll(prev => prev.includes(clean) ? prev : [...prev, clean]);
    } else if (group === 'mayAny') {
      setQuickRuleMayAny(prev => prev.includes(clean) ? prev : [...prev, clean]);
    } else if (group === 'mustNot') {
      setQuickRuleMustNot(prev => prev.includes(clean) ? prev : [...prev, clean]);
    }
  };

  const removeQuickRuleTerm = (term, group) => {
    if (group === 'mustAll') {
      setQuickRuleMustAll(prev => prev.filter(t => t !== term));
    } else if (group === 'mayAny') {
      setQuickRuleMayAny(prev => prev.filter(t => t !== term));
    } else if (group === 'mustNot') {
      setQuickRuleMustNot(prev => prev.filter(t => t !== term));
    }
  };

  const insertQuickRuleTag = (tag) => {
    setQuickRuleHistText(prev => prev ? `${prev} ${tag}` : tag);
  };

  const cleanQuickRuleJunk = () => {
    const cleaned = cleanJunkNumbers(quickRuleHistText);
    setQuickRuleHistText(cleaned || '[HISTORICO]');
    addToast('🧹 Códigos numéricos longos removidos do histórico!', 'info');
  };

  const handleQuickRuleSave = () => {
    if (quickRuleMustAll.length === 0 && quickRuleMayAny.length === 0) {
      addToast('Adicione ao menos um termo de busca (E ou OU) para a regra.', 'warning');
      return;
    }

    const newRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: quickRuleName.trim() || (quickRuleMustAll.length > 0 ? quickRuleMustAll.join(' + ') : 'Nova Regra'),
      mustContainAll: quickRuleMustAll,
      mayContainAny: quickRuleMayAny,
      mustNotContain: quickRuleMustNot,
      pattern: quickRuleMustAll.join(','),
      orPattern: quickRuleMayAny.join(','),
      notPattern: quickRuleMustNot.join(','),
      matchMode: quickRuleMatchMode,
      valueType: quickRuleValueType,
      exactValue: quickRuleExactValue ? parseFloat(quickRuleExactValue) : null,
      minValue: quickRuleMinValue ? parseFloat(quickRuleMinValue) : null,
      maxValue: quickRuleMaxValue ? parseFloat(quickRuleMaxValue) : null,
      signalCondition: quickRuleSignalCondition,
      ruleType: quickRuleType,
      targetAccount: quickRuleType === 'dynamic' ? quickRuleTargetAccount.trim() : '',
      debitAccount: quickRuleType === 'fixed' ? quickRuleDebit.trim() : '',
      creditAccount: quickRuleType === 'fixed' ? quickRuleCredit.trim() : '',
      historicCode: quickRuleHistCode || '',
      historicTextTemplate: quickRuleHistText.trim() || '[HISTORICO]',
      historicText: quickRuleHistText.trim() || '[HISTORICO]'
    };

    addDeParaRule(newRule);
    setQuickRuleTx(null);
    addToast('⚡ Regra De-Para salva no dicionário e aplicada aos lançamentos correspondentes!', 'success');
  };

  // Filter and search transactions
  const processedTransactions = useMemo(() => {
    return transactions.map((tx, idx) => {
      let status = 'pending';
      if (tx.debitAccount && tx.creditAccount) {
        status = tx.isSuggested ? 'suggested' : 'mapped';
      }
      return { ...tx, originalIndex: idx, status };
    });
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return processedTransactions.filter(tx => {
      if (filterStatus === 'pending' && tx.status !== 'pending') return false;
      if (filterStatus === 'mapped' && tx.status !== 'mapped') return false;
      if (filterStatus === 'suggested' && tx.status !== 'suggested') return false;
      if (filterStatus === 'renamed' && !tx.supplierName) return false;

      if (valueFilter === 'negative' && tx.value >= 0) return false;
      if (valueFilter === 'positive' && tx.value < 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const descMatch = (tx.description || '').toLowerCase().includes(q);
        const origMatch = (tx.originalDescription || '').toLowerCase().includes(q);
        const suppMatch = (tx.supplierName || '').toLowerCase().includes(q);
        const valMatch = String(tx.value || '').includes(q);
        const debMatch = (tx.debitAccount || '').includes(q);
        const credMatch = (tx.creditAccount || '').includes(q);
        return descMatch || origMatch || suppMatch || valMatch || debMatch || credMatch;
      }

      return true;
    });
  }, [processedTransactions, filterStatus, valueFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const handleExportExcel = () => {
    if (transactions.length === 0) return;
    try {
      const sheetRows = transactions.map(tx => ({
        'Data': tx.date || '',
        'Descrição / Histórico': tx.description || '',
        'Valor (R$)': Number(tx.value || 0),
        'Conta Débito': tx.debitAccount || '',
        'Conta Crédito': tx.creditAccount || '',
        'Cód. Histórico': tx.historicCode || '10',
        'Histórico Complementar': tx.historicText || '',
        'Status': tx.debitAccount && tx.creditAccount ? 'Mapeado' : 'Pendente'
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetRows);
      worksheet['!cols'] = [{ wch: 12 }, { wch: 45 }, { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 35 }, { wch: 12 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'LANCAMENTOS_DEPARA');

      const clean = activeCompany?.name ? activeCompany.name.toLowerCase().replace(/[^a-z0-9]/gi, '_') : 'empresa';
      XLSX.writeFile(workbook, `contahub_depara_${clean}_${new Date().toISOString().split('T')[0]}.xlsx`);
      addToast(`Planilha Excel gerada (${transactions.length} lançamentos)!`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Erro ao exportar planilha Excel.', 'error');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Deseja realmente limpar todos os lançamentos carregados nesta tabela?')) {
      setTransactions([]);
      addToast('Lançamentos limpos.', 'info');
    }
  };

  // Demo data test
  const handleLoadDemoData = () => {
    const demoRows = [
      { date: '02/07/2026', description: 'TARIFA BANCARIA REF CARTAO', value: -42.50, debitAccount: '3101', creditAccount: '777', historicCode: '10', historicText: 'TARIFA BANCARIA REF CARTAO', isSuggested: false },
      { date: '03/07/2026', description: 'RECEBIMENTO DE JOAO DA SILVA', value: 1500.00, debitAccount: '777', creditAccount: '1101', historicCode: '10', historicText: 'RECEBIMENTO DE JOAO DA SILVA', isSuggested: false },
      { date: '04/07/2026', description: 'RENDIMENTO APLICACAO AUTOMATICA', value: 12.84, debitAccount: '777', creditAccount: '4101', historicCode: '10', historicText: 'RENDIMENTO APLICACAO AUTOMATICA', isSuggested: true },
      { date: '05/07/2026', description: 'PAGAMENTO A POSTO IPIRANGA', value: -180.00, debitAccount: '3102', creditAccount: '777', historicCode: '10', historicText: 'PAGAMENTO A POSTO IPIRANGA', isSuggested: false },
      { date: '06/07/2026', description: 'DOC EMITIDO SALARIOS DE FUNCIONARIOS', value: -8500.00, debitAccount: '2105', creditAccount: '777', historicCode: '10', historicText: 'DOC EMITIDO SALARIOS DE FUNCIONARIOS', isSuggested: true },
      { date: '08/07/2026', description: 'TARIFA BANCARIA CESTA BASICA PJ', value: -29.90, debitAccount: '3101', creditAccount: '777', historicCode: '10', historicText: 'TARIFA BANCARIA CESTA BASICA PJ', isSuggested: false },
      { date: '10/07/2026', description: 'PGTO ENERGIA ELETRICA - COELBA', value: -452.10, debitAccount: '3103', creditAccount: '777', historicCode: '10', historicText: 'PGTO ENERGIA ELETRICA - COELBA', isSuggested: false },
      { date: '12/07/2026', description: 'RECEBIMENTO DE EMPRESA XYZ LTDA', value: 5400.00, debitAccount: '777', creditAccount: '1101', historicCode: '10', historicText: 'RECEBIMENTO DE EMPRESA XYZ LTDA', isSuggested: true }
    ];

    setTransactions(demoRows.map((r, i) => ({
      ...r,
      id: `demo_${i}_${Date.now()}`,
      originalDescription: r.description
    })));
    addToast('Dados de demonstração carregados!', 'success');
  };

  // Stats computation
  const stats = {
    total: transactions.length,
    mapped: transactions.filter(t => t.debitAccount && t.creditAccount && !t.isSuggested).length,
    suggested: transactions.filter(t => t.isSuggested).length,
    pending: transactions.filter(t => !t.debitAccount || !t.creditAccount).length,
    renamed: transactions.filter(t => Boolean(t.supplierName)).length,
    totalValue: transactions.reduce((acc, t) => acc + Math.abs(t.value || 0), 0)
  };

  // Dedicated Dropzone View When Empty (Domínio Importer Flow)
  if (transactions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '820px', margin: '30px auto', width: '100%' }}>
        <div className="card" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Carregar Lançamentos
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '620px', margin: '0 auto', lineHeight: '1.5' }}>
              Importe seu arquivo Excel (.xlsx, .xls) ou OFX/CSV contendo os lançamentos financeiros/extrato bancário da empresa <strong>{activeCompany?.name}</strong>.
            </p>
          </div>

          {/* Interactive Drag & Drop Area */}
          <div
            className={`upload-dropzone-box ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--accent-cyan)',
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragOver ? 'rgba(45, 212, 191, 0.12)' : 'rgba(45, 212, 191, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv,.ofx,.txt" 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />

            <div style={{ padding: '14px', borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent-cyan)' }}>
              <UploadCloud size={40} />
            </div>

            <div>
              <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '1.05rem' }}>
                {isLoadingFile ? 'Processando arquivo...' : 'Selecione um arquivo ou arraste aqui'}
              </span>
            </div>

            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Formatos suportados: Excel (.xlsx, .xls), CSV ou OFX
            </span>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <div style={{ height: '1px', background: 'var(--border-subtle)', flex: 1 }}></div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>OU ESCOLHA UMA OPÇÃO</span>
            <div style={{ height: '1px', background: 'var(--border-subtle)', flex: 1 }}></div>
          </div>

          {/* Action Choice Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={handleLoadDemoData} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}>
              <Sparkles size={16} color="var(--color-warning)" /> Testar com Dados Fictícios de Exemplo
            </button>
            <button className="btn btn-outline" onClick={() => useAppStore.getState().setActivePage('upload')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}>
              <Plus size={16} /> Importar da Auditoria
            </button>
            <button className="btn btn-outline" onClick={() => useAppStore.getState().setActivePage('ocr')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}>
              <Sparkles size={16} color="var(--accent-teal)" /> OCR de PDFs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header Banner & Counterpart Input */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--accent-glow)', color: 'var(--accent-cyan)' }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                Lançamentos & Conciliação De-Para (Domínio)
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Empresa: <strong>{activeCompany?.name}</strong> • {stats.total} lançamentos ({formatCurrency(stats.totalValue)})
              </span>
            </div>
          </div>

          {/* Default Counterpart Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <Landmark size={16} color="var(--accent-cyan)" />
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              Contrapartida Padrão (Banco / Caixa):
            </label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ex: 777 ou 1101" 
              value={defaultCounterpart}
              onChange={(e) => handleDefaultCounterpartChange(e.target.value)}
              style={{ width: '180px', height: '34px', minHeight: '34px', padding: '4px 8px', fontSize: '0.82rem', margin: 0, fontFamily: 'var(--font-mono)' }}
              list="plano-contas-list"
            />
            <datalist id="plano-contas-list">
              {planoContas.map(c => (
                <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
              ))}
            </datalist>
          </div>

          {/* Top Actions Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
              type="file" 
              ref={topFileInputRef}
              accept=".xlsx,.xls,.csv,.ofx,.txt" 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => topFileInputRef.current?.click()} 
              title="Carregar Nova Planilha / Extrato"
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <FolderOpen size={14} color="var(--accent-cyan)" /> Importar Planilha
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsMappingModalOpen(true)} title="Configurar Mapeamento de Layout">
              <Settings size={14} /> Configurar Layout
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportExcel} title="Exportar Planilha Excel">
              <Download size={14} /> Excel
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleClearAll} title="Limpar Lançamentos">
              <Trash2 size={14} /> Limpar
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => openModal('export')} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <FileText size={15} /> Exportar TXT Domínio
            </button>
          </div>
        </div>

        {/* Stats Capsules Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Lançamentos</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {stats.total}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', textTransform: 'uppercase', fontWeight: 700 }}>Mapeados (OK)</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>
              {stats.mapped}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', textTransform: 'uppercase', fontWeight: 700 }}>Sugeridos por Regra</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-warning)' }}>
              {stats.suggested}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)', textTransform: 'uppercase', fontWeight: 700 }}>Pendentes de Conta</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-danger)' }}>
              {stats.pending}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Filters & Search */}
      <div className="toolbar-card" style={{ padding: '10px 16px' }}>
        <div className="toolbar-top-row" style={{ gap: '12px' }}>
          <div className="panel-search-box" style={{ maxWidth: '420px', height: '36px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="form-input panel-search-input"
              placeholder="Buscar por descrição, valor, conta..."
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

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Status Filter Chips */}
            <div className="filter-chips">
              <button className={`chip-btn ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}>
                Todos ({stats.total})
              </button>
              <button className={`chip-btn ${filterStatus === 'mapped' ? 'active' : ''}`} onClick={() => { setFilterStatus('mapped'); setCurrentPage(1); }}>
                Mapeados ({stats.mapped})
              </button>
              <button className={`chip-btn ${filterStatus === 'suggested' ? 'active' : ''}`} onClick={() => { setFilterStatus('suggested'); setCurrentPage(1); }}>
                Sugeridos ({stats.suggested})
              </button>
              <button className={`chip-btn ${filterStatus === 'pending' ? 'active' : ''}`} onClick={() => { setFilterStatus('pending'); setCurrentPage(1); }}>
                Pendentes ({stats.pending})
              </button>
              {stats.renamed > 0 && (
                <button 
                  className={`chip-btn ${filterStatus === 'renamed' ? 'active' : ''}`} 
                  onClick={() => { setFilterStatus('renamed'); setCurrentPage(1); }}
                  style={{ color: 'var(--accent-cyan)', borderColor: filterStatus === 'renamed' ? 'var(--accent-cyan)' : undefined }}
                >
                  🏷️ Fornecedor / XML ({stats.renamed})
                </button>
              )}
            </div>

            {/* Value Filter Chips */}
            <div className="filter-chips" style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '8px' }}>
              <button className={`chip-btn ${valueFilter === 'all' ? 'active' : ''}`} onClick={() => { setValueFilter('all'); setCurrentPage(1); }}>
                Todos Sinais
              </button>
              <button className={`chip-btn ${valueFilter === 'negative' ? 'active' : ''}`} onClick={() => { setValueFilter('negative'); setCurrentPage(1); }}>
                Saídas (-)
              </button>
              <button className={`chip-btn ${valueFilter === 'positive' ? 'active' : ''}`} onClick={() => { setValueFilter('positive'); setCurrentPage(1); }}>
                Entradas (+)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Table with Balanced Proportions */}
      <div className="card" style={{ padding: '0', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
        <table className="classic-data-table" style={{ tableLayout: 'fixed', width: '100%', margin: 0, boxSizing: 'border-box' }}>
          <thead>
            <tr>
              <th style={{ width: '28px', textAlign: 'center', padding: '8px 2px' }}>#</th>
              <th style={{ width: '66px', textAlign: 'center', padding: '8px 2px' }}>Status</th>
              <th style={{ width: '74px', padding: '8px 4px' }}>Data</th>
              <th style={{ width: '29%', padding: '8px 6px' }}>Histórico / Descrição</th>
              <th style={{ width: '88px', textAlign: 'right', padding: '8px 4px' }}>Valor (R$)</th>
              <th style={{ width: '65px', textAlign: 'center', padding: '8px 2px' }}>C. Débito</th>
              <th style={{ width: '65px', textAlign: 'center', padding: '8px 2px' }}>C. Crédito</th>
              <th style={{ width: '36px', textAlign: 'center', padding: '8px 2px' }}>Hist</th>
              <th style={{ width: '27%', padding: '8px 6px' }}>Histórico Complementar</th>
              <th style={{ width: '86px', textAlign: 'center', padding: '8px 2px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Nenhum lançamento encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => {
                return (
                  <tr key={tx.id}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', padding: '6px 2px' }}>
                      {tx.originalIndex + 1}
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 2px' }}>
                      {tx.status === 'mapped' && (
                        <span className="badge badge-exact" style={{ fontSize: '0.65rem', padding: '2px 4px' }}>OK</span>
                      )}
                      {tx.status === 'suggested' && (
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '2px 4px' }}>Sugerido</span>
                      )}
                      {tx.status === 'pending' && (
                        <span className="badge" style={{ fontSize: '0.65rem', padding: '2px 4px', background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.3)' }}>Pendente</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', padding: '6px 4px', whiteSpace: 'nowrap' }}>
                      {tx.date}
                    </td>
                    <td style={{ padding: '6px 8px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <span 
                          style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} 
                          title={tx.description}
                        >
                          {tx.description}
                        </span>
                        {tx.supplierName ? (
                          <div 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              background: 'rgba(45, 212, 191, 0.1)', 
                              border: '1px solid rgba(45, 212, 191, 0.28)', 
                              padding: '1px 6px', 
                              borderRadius: '4px',
                              width: 'fit-content',
                              maxWidth: '100%',
                              cursor: 'help'
                            }}
                            title={`🏷️ Fornecedor Conciliado do Razão/XML: "${tx.supplierName}"${tx.document ? ` (Doc/NF: ${tx.document})` : ''}\n🏦 Descrição Original no Extrato Bancário: "${tx.originalDescription || 'N/A'}"\n⚡ Motor: ${tx.matchPass || 'Conciliado'}`}
                          >
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-cyan)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              🏷️ Razão/XML: {tx.supplierName} {tx.document && `(NF ${tx.document})`}
                            </span>
                          </div>
                        ) : tx.originalDescription && tx.originalDescription !== tx.description ? (
                          <span 
                            style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            title={`Descrição original no banco: ${tx.originalDescription}`}
                          >
                            Orig: {tx.originalDescription}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="grid-cell-money" style={{ color: tx.value < 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 700, fontSize: '0.8rem', padding: '6px 6px' }}>
                      {formatCurrency(tx.value)}
                    </td>

                    {/* Conta Débito Cell with Autocomplete */}
                    <td style={{ position: 'relative', padding: '6px 4px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '4px 4px', fontSize: '0.82rem', height: '32px', minHeight: '32px', fontFamily: 'var(--font-mono)', textAlign: 'center', fontWeight: 700, width: '100%', boxSizing: 'border-box' }}
                        placeholder="Débito"
                        value={tx.debitAccount || ''}
                        onChange={(e) => updateTransaction(tx.originalIndex, { debitAccount: e.target.value })}
                        onFocus={() => {
                          setActiveCell({ rowIndex: tx.originalIndex, field: 'debitAccount' });
                          setAutoSearch(tx.debitAccount || '');
                        }}
                      />
                      {activeCell?.rowIndex === tx.originalIndex && activeCell?.field === 'debitAccount' && autocompleteSuggestions.length > 0 && (
                        <div className="autocomplete-dropdown" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, width: '260px', background: 'var(--bg-surface)', border: '1px solid var(--border-focus)', borderRadius: '8px', boxShadow: 'var(--shadow-lg)', maxHeight: '180px', overflowY: 'auto' }}>
                          {autocompleteSuggestions.map(acc => (
                            <div
                              key={acc.code}
                              onClick={() => selectSuggestion(tx.originalIndex, 'debitAccount', acc.code)}
                              style={{ padding: '6px 8px', fontSize: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-glow)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <strong>{acc.code}</strong>
                              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{acc.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Conta Crédito Cell with Autocomplete */}
                    <td style={{ position: 'relative', padding: '6px 4px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '4px 4px', fontSize: '0.82rem', height: '32px', minHeight: '32px', fontFamily: 'var(--font-mono)', textAlign: 'center', fontWeight: 700, width: '100%', boxSizing: 'border-box' }}
                        placeholder="Crédito"
                        value={tx.creditAccount || ''}
                        onChange={(e) => updateTransaction(tx.originalIndex, { creditAccount: e.target.value })}
                        onFocus={() => {
                          setActiveCell({ rowIndex: tx.originalIndex, field: 'creditAccount' });
                          setAutoSearch(tx.creditAccount || '');
                        }}
                      />
                      {activeCell?.rowIndex === tx.originalIndex && activeCell?.field === 'creditAccount' && autocompleteSuggestions.length > 0 && (
                        <div className="autocomplete-dropdown" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, width: '260px', background: 'var(--bg-surface)', border: '1px solid var(--border-focus)', borderRadius: '8px', boxShadow: 'var(--shadow-lg)', maxHeight: '180px', overflowY: 'auto' }}>
                          {autocompleteSuggestions.map(acc => (
                            <div
                              key={acc.code}
                              onClick={() => selectSuggestion(tx.originalIndex, 'creditAccount', acc.code)}
                              style={{ padding: '6px 8px', fontSize: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-glow)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <strong>{acc.code}</strong>
                              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{acc.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Cód Histórico */}
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '4px 2px', fontSize: '0.78rem', height: '32px', minHeight: '32px', textAlign: 'center', fontFamily: 'var(--font-mono)', width: '100%', boxSizing: 'border-box' }}
                        value={tx.historicCode || ''}
                        onChange={(e) => updateTransaction(tx.originalIndex, { historicCode: e.target.value })}
                      />
                    </td>

                    {/* Histórico Complementar */}
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', height: '32px', minHeight: '32px', width: '100%', boxSizing: 'border-box' }}
                        value={tx.historicText || ''}
                        title={tx.historicText || ''}
                        onChange={(e) => updateTransaction(tx.originalIndex, { historicText: e.target.value })}
                      />
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center', padding: '4px 2px' }}>
                      <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 5px', fontSize: '0.68rem', height: '26px', whiteSpace: 'nowrap' }}
                          onClick={() => startQuickRule(tx)}
                          title="Criar Regra Rápida De-Para a partir deste lançamento"
                        >
                          <Sparkles size={10} color="var(--accent-cyan)" /> Regra
                        </button>
                        <button
                          className="card-action-btn delete-btn"
                          onClick={() => deleteTransaction(tx.originalIndex)}
                          title="Excluir linha"
                          style={{ width: '26px', height: '26px' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Página {currentPage} de {totalPages} ({filteredTransactions.length} lançamentos filtrados)
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Rule Modal Window (Domínio-Inspired Visual Builder) */}
      {quickRuleTx && (() => {
        const rowTokens = tokenizeDescription(quickRuleTx.description);
        const tempRuleObj = {
          mustContainAll: quickRuleMustAll,
          mayContainAny: quickRuleMayAny,
          mustNotContain: quickRuleMustNot,
          matchMode: quickRuleMatchMode,
          signalCondition: quickRuleSignalCondition,
          valueType: quickRuleValueType,
          exactValue: quickRuleExactValue ? parseFloat(quickRuleExactValue) : null,
          minValue: quickRuleMinValue ? parseFloat(quickRuleMinValue) : null,
          maxValue: quickRuleMaxValue ? parseFloat(quickRuleMaxValue) : null,
          historicTextTemplate: quickRuleHistText
        };
        const ruleFormula = generateLogicalFormula(tempRuleObj);
        const previewEval = evaluateRule(tempRuleObj, quickRuleTx, '1001', activeCompany || {});

        return (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content glass-card" style={{ maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto', border: '2px solid var(--accent-cyan)' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wand2 size={20} color="var(--accent-cyan)" />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    Montagem da Regra Contábil ({activeCompany?.name || 'Empresa'})
                  </h3>
                </div>
                <button onClick={() => setQuickRuleTx(null)} className="btn-outline btn-sm" style={{ padding: '4px 8px' }}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '18px 0' }}>
                
                {/* Nome da Regra */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    Nome de Identificação da Regra:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={quickRuleName}
                    onChange={(e) => setQuickRuleName(e.target.value)}
                    placeholder="Ex: DARF Arrecadação 0385, Pagamento PIX Fornecedor..."
                  />
                </div>

                {/* BLOCO 1: DICIONÁRIO / FATIADOR DE PALAVRAS DO EXTRATO */}
                <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Database size={15} /> 1. Dicionário de Termos do Extrato
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={cleanQuickRuleJunk}
                      style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eraser size={12} /> Limpar Ruídos Numéricos
                    </button>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Extrato Original: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{quickRuleTx.description}</strong>
                  </div>

                  {/* Fatiador de Palavras */}
                  <div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      Clique nos botões de cada palavra para adicionar à regra:
                    </span>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {/* Entire phrase */}
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.72rem', padding: '3px 6px', color: 'var(--text-primary)', fontWeight: 700 }}>
                          [Completo]
                        </span>
                        <button type="button" onClick={() => addQuickRuleTerm(quickRuleTx.description, 'mustAll')} style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-success)', border: 'none', padding: '3px 5px', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}>+E</button>
                        <button type="button" onClick={() => addQuickRuleTerm(quickRuleTx.description, 'mayAny')} style={{ background: 'rgba(45, 212, 191, 0.2)', color: 'var(--accent-cyan)', border: 'none', padding: '3px 5px', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}>+OU</button>
                      </div>

                      {/* Extracted tokens */}
                      {rowTokens.map((token, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.74rem', padding: '3px 6px', color: 'var(--text-primary)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                            {token}
                          </span>
                          <button type="button" onClick={() => addQuickRuleTerm(token, 'mustAll')} title="Obrigatório (E)" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-success)', border: 'none', padding: '3px 5px', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}>+E</button>
                          <button type="button" onClick={() => addQuickRuleTerm(token, 'mayAny')} title="Alternativo (OU)" style={{ background: 'rgba(45, 212, 191, 0.2)', color: 'var(--accent-cyan)', border: 'none', padding: '3px 5px', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}>+OU</button>
                          <button type="button" onClick={() => addQuickRuleTerm(token, 'mustNot')} title="Exceção (NÃO)" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)', border: 'none', padding: '3px 5px', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}>+NÃO</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add manual term */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Outro termo manual..."
                      value={quickRuleCustomInput}
                      onChange={(e) => setQuickRuleCustomInput(e.target.value)}
                      style={{ fontSize: '0.78rem' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addQuickRuleTerm(quickRuleCustomInput, 'mustAll');
                          setQuickRuleCustomInput('');
                        }
                      }}
                    />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { addQuickRuleTerm(quickRuleCustomInput, 'mustAll'); setQuickRuleCustomInput(''); }} style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '0.74rem' }}>
                      + E
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { addQuickRuleTerm(quickRuleCustomInput, 'mayAny'); setQuickRuleCustomInput(''); }} style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.74rem' }}>
                      + OU
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { addQuickRuleTerm(quickRuleCustomInput, 'mustNot'); setQuickRuleCustomInput(''); }} style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: '0.74rem' }}>
                      + NÃO
                    </button>
                  </div>

                  {/* Term Buckets */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', borderTop: '1px dashed var(--border-subtle)', paddingTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-success)', minWidth: '150px' }}>🟢 Contém TODAS (E):</span>
                      {quickRuleMustAll.length === 0 ? <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(Nenhum)</span> : quickRuleMustAll.map((t, idx) => (
                        <span key={idx} className="badge badge-accent" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', fontSize: '0.72rem' }}>
                          {t} <X size={11} style={{ cursor: 'pointer' }} onClick={() => removeQuickRuleTerm(t, 'mustAll')} />
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-cyan)', minWidth: '150px' }}>🔵 Contém QUALQUER (OU):</span>
                      {quickRuleMayAny.length === 0 ? <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(Nenhum)</span> : quickRuleMayAny.map((t, idx) => (
                        <span key={idx} className="badge badge-accent" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(45, 212, 191, 0.15)', color: 'var(--accent-cyan)', fontSize: '0.72rem' }}>
                          {t} <X size={11} style={{ cursor: 'pointer' }} onClick={() => removeQuickRuleTerm(t, 'mayAny')} />
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-danger)', minWidth: '150px' }}>🔴 NÃO PODE Conter (NÃO):</span>
                      {quickRuleMustNot.length === 0 ? <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(Nenhum)</span> : quickRuleMustNot.map((t, idx) => (
                        <span key={idx} className="badge badge-accent" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)', fontSize: '0.72rem' }}>
                          {t} <X size={11} style={{ cursor: 'pointer' }} onClick={() => removeQuickRuleTerm(t, 'mustNot')} />
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Modo de Comparação & Fórmula */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 800 }}>Modo de Comparação:</span>
                      <label style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input type="radio" name="quickMatchMode" checked={quickRuleMatchMode === 'contains'} onChange={() => setQuickRuleMatchMode('contains')} />
                        <span>Contendo (%termo%)</span>
                      </label>
                      <label style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input type="radio" name="quickMatchMode" checked={quickRuleMatchMode === 'startsWith'} onChange={() => setQuickRuleMatchMode('startsWith')} />
                        <span>Iniciando com (termo%)</span>
                      </label>
                      <label style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input type="radio" name="quickMatchMode" checked={quickRuleMatchMode === 'endsWith'} onChange={() => setQuickRuleMatchMode('endsWith')} />
                        <span>Terminando com (%termo)</span>
                      </label>
                    </div>

                    <div style={{ background: '#0f172a', padding: '8px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', overflowX: 'auto', lineHeight: '1.4' }}>
                      <span style={{ color: 'var(--text-muted)' }}>FÓRMULA LÓGICA: </span>{ruleFormula}
                    </div>
                  </div>
                </div>

                {/* BLOCO 2: CONDIÇÕES DE VALOR & SINAL */}
                <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={15} /> 2. Condição de Valor & Sinal
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700 }}>Condição de Valor:</label>
                      <select
                        className="form-input"
                        value={quickRuleValueType}
                        onChange={(e) => setQuickRuleValueType(e.target.value)}
                      >
                        <option value="any">Qualquer Valor</option>
                        <option value="exact">Valor Exato (== R$)</option>
                        <option value="range">Faixa (Min e Max)</option>
                        <option value="greater">Maior que (&gt; R$)</option>
                        <option value="less">Menor que (&lt; R$)</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700 }}>Sinal / Movimento:</label>
                      <select
                        className="form-input"
                        value={quickRuleSignalCondition}
                        onChange={(e) => setQuickRuleSignalCondition(e.target.value)}
                      >
                        <option value="any">Qualquer Movimento (+ / -)</option>
                        <option value="debit_only">Apenas Saídas (Débito [-])</option>
                        <option value="credit_only">Apenas Entradas (Crédito [+])</option>
                      </select>
                    </div>
                  </div>

                  {quickRuleValueType === 'exact' && (
                    <div>
                      <label className="form-label" style={{ fontSize: '0.76rem' }}>Valor Exato (R$):</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={quickRuleExactValue}
                        onChange={(e) => setQuickRuleExactValue(e.target.value)}
                        placeholder="Ex: 150.50"
                      />
                    </div>
                  )}

                  {quickRuleValueType === 'range' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.76rem' }}>Valor Mínimo (R$):</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={quickRuleMinValue}
                          onChange={(e) => setQuickRuleMinValue(e.target.value)}
                          placeholder="Ex: 10.00"
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.76rem' }}>Valor Máximo (R$):</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={quickRuleMaxValue}
                          onChange={(e) => setQuickRuleMaxValue(e.target.value)}
                          placeholder="Ex: 500.00"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* BLOCO 3: CONTAS CONTÁBEIS */}
                <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--accent-petroleum)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BookOpen size={15} /> 3. Contas Contábeis (Plano de Contas)
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.76rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="quickRuleTypeRadio"
                          checked={quickRuleType === 'dynamic'}
                          onChange={() => setQuickRuleType('dynamic')}
                        />
                        <span>Dinâmica</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="quickRuleTypeRadio"
                          checked={quickRuleType === 'fixed'}
                          onChange={() => setQuickRuleType('fixed')}
                        />
                        <span>Fixa (D e C)</span>
                      </label>
                    </div>
                  </div>

                  {quickRuleType === 'dynamic' ? (
                    <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                      <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700 }}>
                        Conta Contábil Alvo (Despesa / Fornecedor / Receita):
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Digite o código ou nome da conta..."
                        value={quickRuleTargetAccount}
                        onChange={(e) => {
                          setQuickRuleTargetAccount(e.target.value);
                          setAutoSearch(e.target.value);
                        }}
                        onFocus={() => {
                          setAutoSearch(quickRuleTargetAccount);
                        }}
                        list="plano-contas-list"
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700 }}>Conta Débito:</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Código Débito..."
                          value={quickRuleDebit}
                          onChange={(e) => setQuickRuleDebit(e.target.value)}
                          list="plano-contas-list"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700 }}>Conta Crédito:</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Código Crédito..."
                          value={quickRuleCredit}
                          onChange={(e) => setQuickRuleCredit(e.target.value)}
                          list="plano-contas-list"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* BLOCO 4: HISTÓRICO CONTÁBIL COM VARIÁVEIS E TRECHOS */}
                <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={15} /> 4. Histórico Contábil Personalizado
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700 }}>Cód Hist:</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Opcional"
                        value={quickRuleHistCode}
                        onChange={(e) => setQuickRuleHistCode(e.target.value)}
                        style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700 }}>Editor do Histórico:</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Clique nos trechos ou variáveis abaixo para montar..."
                        value={quickRuleHistText}
                        onChange={(e) => setQuickRuleHistText(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Trechos do Histórico */}
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      Trechos do Extrato:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {rowTokens.map((w, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => insertQuickRuleTag(w)}
                          style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                        >
                          + {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Variáveis do Sistema */}
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      Variáveis do Sistema:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertQuickRuleTag('[HISTORICO]')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        + [HISTORICO]
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertQuickRuleTag('[FORNECEDOR]')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        + [FORNECEDOR]
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertQuickRuleTag('[DOC]')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        + [DOC]
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertQuickRuleTag('[DATA]')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        + [DATA]
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertQuickRuleTag('[VALOR]')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        + [VALOR]
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertQuickRuleTag('[BANCO]')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        + [BANCO]
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertQuickRuleTag('[MES]')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        + [MES]
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertQuickRuleTag('[ANO]')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        + [ANO]
                      </button>
                    </div>
                  </div>

                  {/* Live History Preview */}
                  <div style={{ background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800 }}>PRÉVIA DO HISTÓRICO GERADO: </span>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                      {previewEval ? previewEval.historicText : quickRuleHistText}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setQuickRuleTx(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleQuickRuleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} /> Salvar Regra no Dicionário
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Spreadsheet Layout Mapping Modal */}
      <MappingModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        columnMapping={columnMapping}
        setColumnMapping={setColumnMapping}
        importedRawData={null}
        onProcess={(mapping) => {
          addToast('Novo layout de colunas aplicado!', 'success');
        }}
        addToast={addToast}
      />
    </div>
  );
}
