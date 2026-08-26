import { create } from 'zustand';
import { 
  getActiveSession, 
  loginUser as apiLogin, 
  registerUser as apiRegister, 
  logoutUser as apiLogout 
} from '../engine/authStorage.js';
import { 
  getCompanies, 
  createCompany as apiCreateCompany, 
  updateCompany as apiUpdateCompany, 
  deleteCompany as apiDeleteCompany,
  getCompanyPlanos,
  saveCompanyPlanos,
  getCompanyRules,
  saveCompanyRules
} from '../engine/companyStorage.js';
import { saveDeParaRule } from '../engine/deParaStorage.js';
import { matchTransactionRule } from '../engine/rulesEngine.js';
import { 
  loadFiscalInvoices, 
  saveFiscalInvoices, 
  mergeInvoices, 
  settleInstallmentInList, 
  unsettleInstallmentInList 
} from '../engine/xmlRepository.js';

const initialUser = getActiveSession();
const initialCompanies = getCompanies();

const useAppStore = create((set, get) => ({
  // Authentication State
  currentUser: initialUser,
  isAuthenticated: Boolean(initialUser),

  login: async (email, password) => {
    const user = await apiLogin(email, password);
    set({ currentUser: user, isAuthenticated: true });
    return user;
  },

  register: async (name, email, password) => {
    const user = await apiRegister(name, email, password);
    set({ currentUser: user, isAuthenticated: true });
    return user;
  },

  logout: () => {
    apiLogout();
    set({ 
      currentUser: null, 
      isAuthenticated: false, 
      activeCompany: null,
      bankFile: null,
      supplierFile: null,
      bankHeaders: [],
      supplierHeaders: [],
      bankRows: [],
      supplierRows: [],
      bankItems: [],
      supplierItems: [],
      reconciliationResult: null,
      selectedMatch: null
    });
  },

  // Multi-Company State
  companies: initialCompanies,
  activeCompany: null,

  createCompany: (name, cnpj = '') => {
    const comp = apiCreateCompany(name, cnpj);
    const updated = getCompanies();
    set({ companies: updated });
    return comp;
  },

  updateCompany: (id, name, cnpj = '') => {
    const updatedComp = apiUpdateCompany(id, name, cnpj);
    const updated = getCompanies();
    const currentActive = get().activeCompany;
    set({ 
      companies: updated,
      activeCompany: currentActive?.id === id ? updatedComp : currentActive
    });
    return updatedComp;
  },

  deleteCompany: (id) => {
    const updated = apiDeleteCompany(id);
    const currentActive = get().activeCompany;
    set({ 
      companies: updated,
      activeCompany: currentActive?.id === id ? null : currentActive
    });
  },

  setActiveCompany: (company) => {
    if (!company) {
      set({ 
        activeCompany: null,
        planosList: [],
        activePlanoId: '',
        deParaRules: [],
        bankFile: null,
        supplierFile: null,
        bankItems: [],
        supplierItems: [],
        reconciliationResult: null,
        activePage: 'upload'
      });
      return;
    }

    // Load isolated data for this company
    const planos = getCompanyPlanos(company.id);
    const rules = getCompanyRules(company.id);
    const invoices = loadFiscalInvoices(company.id);

    set({ 
      activeCompany: company,
      planosList: planos,
      activePlanoId: planos.length > 0 ? planos[0].id : '',
      deParaRules: rules,
      fiscalInvoices: invoices,
      // Clear working files on company switch for fresh isolation
      bankFile: null,
      supplierFile: null,
      bankHeaders: [],
      supplierHeaders: [],
      bankRows: [],
      supplierRows: [],
      bankItems: [],
      supplierItems: [],
      reconciliationResult: null,
      selectedMatch: null,
      activePage: 'upload'
    });
  },

  clearActiveCompany: () => {
    set({ 
      activeCompany: null,
      bankFile: null,
      supplierFile: null,
      bankItems: [],
      supplierItems: [],
      reconciliationResult: null,
      selectedMatch: null
    });
  },

  // Active Navigation Page
  activePage: 'upload', // 'upload' | 'graph' | 'ocr' | 'plano' | 'rules' | 'report' | 'settings'
  setActivePage: (page) => set({ activePage: page }),

  // Theme: 'dark' | 'light'
  theme: localStorage.getItem('contahub_theme') || 'dark',
  setTheme: (theme) => {
    localStorage.setItem('contahub_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  // View Mode: 'table' | 'grid' | 'graph'
  viewMode: 'table',
  setViewMode: (viewMode) => set({ viewMode }),

  // Sidebar collapse
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // Plano de Contas Management (Isolated per company)
  planosList: [],
  activePlanoId: '',
  setPlanosList: (list) => {
    const { activeCompany } = get();
    if (activeCompany) {
      saveCompanyPlanos(activeCompany.id, list);
    }
    set({ planosList: list });
  },
  setActivePlanoId: (id) => set({ activePlanoId: id }),

  // Advanced De-Para Rules Management (Isolated per company)
  deParaRules: [],
  setDeParaRules: (rules) => {
    const { activeCompany } = get();
    if (activeCompany) {
      saveCompanyRules(activeCompany.id, rules);
    }
    set({ deParaRules: rules });
  },
  addDeParaRule: (rule) => {
    const { activeCompany, deParaRules, transactions } = get();
    const list = [rule, ...deParaRules];
    if (activeCompany) {
      saveCompanyRules(activeCompany.id, list);
    }

    // Re-evaluate pending transactions in real time
    const updatedTransactions = transactions.map(tx => {
      if (!tx.debitAccount || !tx.creditAccount) {
        const m = matchTransactionRule(tx.description, tx.value, list, '', tx.historicText || '', [tx.date, tx.description, tx.value]);
        if (m) {
          return {
            ...tx,
            debitAccount: m.debitAccount || tx.debitAccount,
            creditAccount: m.creditAccount || tx.creditAccount,
            historicCode: m.historicCode || tx.historicCode,
            historicText: m.historicText || tx.historicText,
            isSuggested: true
          };
        }
      }
      return tx;
    });

    set({ deParaRules: list, transactions: updatedTransactions });
  },
  deleteDeParaRule: (id) => {
    const { activeCompany, deParaRules } = get();
    const list = deParaRules.filter(r => r.id !== id);
    if (activeCompany) {
      saveCompanyRules(activeCompany.id, list);
    }
    set({ deParaRules: list });
  },

  // Bank & Supplier Data
  bankFile: null,
  supplierFile: null,
  bankHeaders: [],
  supplierHeaders: [],
  bankRows: [],
  supplierRows: [],
  bankMapping: {},
  supplierMapping: {},
  bankItems: [],
  supplierItems: [],

  setBankFile: (file) => {
    if (!file) {
      set({ bankFile: null, bankHeaders: [], bankRows: [], bankMapping: {}, bankItems: [] });
    } else {
      set({
        bankFile: file,
        bankHeaders: file.headers || [],
        bankRows: file.rows || [],
        bankMapping: file.mapping || {},
        bankItems: file.items || []
      });
    }
  },

  setSupplierFile: (file) => {
    if (!file) {
      set({ supplierFile: null, supplierHeaders: [], supplierRows: [], supplierMapping: {}, supplierItems: [] });
    } else {
      set({
        supplierFile: file,
        supplierHeaders: file.headers || [],
        supplierRows: file.rows || [],
        supplierMapping: file.mapping || {},
        supplierItems: file.items || []
      });
    }
  },

  setBankData: (file, headers, rows, mapping, items) =>
    set({ bankFile: file, bankHeaders: headers, bankRows: rows, bankMapping: mapping, bankItems: items }),

  setSupplierData: (file, headers, rows, mapping, items) =>
    set({ supplierFile: file, supplierHeaders: headers, supplierRows: rows, supplierMapping: mapping, supplierItems: items }),

  clearFiles: () => set({
    bankFile: null,
    supplierFile: null,
    bankHeaders: [],
    supplierHeaders: [],
    bankRows: [],
    supplierRows: [],
    bankMapping: {},
    supplierMapping: {},
    bankItems: [],
    supplierItems: [],
    reconciliationResult: null,
    selectedMatch: null
  }),

  // OCR Dispatch
  setBankFromOcr: (extractedItems, fileName = 'extrato_ocr.pdf') => {
    const mapped = extractedItems.map((item, idx) => ({
      id: `ocr_b_${idx}_${Date.now()}`,
      date: item.date,
      description: item.description,
      amount: Math.abs(item.value),
      isDebit: item.value < 0,
      document: item.document || '',
      cnpj: item.cnpj || '',
      contrapartida: '',
      lote: '',
      raw: item
    }));
    const payload = {
      name: fileName,
      size: 0,
      headers: ['Data', 'Descrição', 'Valor'],
      rows: extractedItems.map(i => [i.date, i.description, i.value]),
      mapping: { date: 'Data', description: 'Descrição', amount: 'Valor' },
      items: mapped,
      logs: [`[${new Date().toLocaleTimeString()}] Importado via OCR (${mapped.length} lançamentos)`]
    };
    set({
      bankFile: payload,
      bankHeaders: payload.headers,
      bankRows: payload.rows,
      bankMapping: payload.mapping,
      bankItems: mapped
    });
  },

  setSupplierFromOcr: (extractedItems, fileName = 'notas_ocr.pdf') => {
    const mapped = extractedItems.map((item, idx) => ({
      id: `ocr_s_${idx}_${Date.now()}`,
      date: item.date,
      description: item.description,
      amount: Math.abs(item.value),
      document: item.document || '',
      cnpj: item.cnpj || '',
      contrapartida: '',
      lote: '',
      raw: item
    }));
    const payload = {
      name: fileName,
      size: 0,
      headers: ['Data', 'Descrição', 'Valor'],
      rows: extractedItems.map(i => [i.date, i.description, i.value]),
      mapping: { date: 'Data', description: 'Descrição', amount: 'Valor' },
      items: mapped,
      logs: [`[${new Date().toLocaleTimeString()}] Importado via OCR (${mapped.length} lançamentos)`]
    };
    set({
      supplierFile: payload,
      supplierHeaders: payload.headers,
      supplierRows: payload.rows,
      supplierMapping: payload.mapping,
      supplierItems: mapped
    });
  },

  // Active Manual Link Selection
  selectedBankItem: null,
  selectedSupplierItem: null,
  setSelectedBankItem: (item) => set({ selectedBankItem: item }),
  setSelectedSupplierItem: (item) => set({ selectedSupplierItem: item }),

  // Reconciliation Results & Progress
  reconciliationResult: null,
  setReconciliationResult: (result) => set({ reconciliationResult: result }),
  isReconciling: false,
  setIsReconciling: (isReconciling) => set({ isReconciling }),
  reconciliationProgress: null,
  setReconciliationProgress: (progress) => set({ reconciliationProgress: progress }),

  // Filters & Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  filterStatus: 'all',
  setFilterStatus: (status) => set({ filterStatus: status }),

  // Match Inspection Panel
  selectedMatch: null,
  setSelectedMatch: (match) => set({ selectedMatch: match }),

  // Manual Reconciliation Match / Link
  manualMatch: (bankItem, supplierItem) => {
    const { reconciliationResult, addToast } = get();
    if (!bankItem || !supplierItem || !reconciliationResult) return;

    saveDeParaRule(bankItem.description, supplierItem.description);

    const primarySupplier = supplierItem;
    const primaryBank = bankItem;
    let rawSupplierName = primarySupplier.description || primarySupplier.favorecido || primarySupplier.razaoSocial || primaryBank.description || '';
    let cleanedSupplierName = rawSupplierName.replace(/^(PIX|TED|DOC|PAGTO|PGTO|RECEBIMENTO|RECEBIDO)\s*[-–]?\s*/gi, '').trim();
    if (!cleanedSupplierName) cleanedSupplierName = rawSupplierName;

    const isIncome = primaryBank.isDebit ? false : ((primaryBank.amount || 0) > 0 || (primaryBank.value || 0) > 0);
    const actionPrefix = isIncome ? 'RECEBIMENTO DE' : 'PAGAMENTO A';
    const docSuffix = primarySupplier.document ? ` - NF ${primarySupplier.document}` : '';
    const enrichedHistoricText = `${actionPrefix} ${cleanedSupplierName}${docSuffix}`.toUpperCase().trim();

    const newMatch = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: '1:1',
      confidence: 100,
      passName: 'Vínculo Manual (De-Para Aprendido)',
      badgeClass: 'badge-exact',
      date: bankItem.date || supplierItem.date || '',
      amount: bankItem.amount || supplierItem.amount || 0,
      value: bankItem.amount || supplierItem.amount || 0,
      bankItems: [bankItem],
      supplierItems: [supplierItem],
      ledgerItems: [supplierItem],
      historicText: enrichedHistoricText,
      description: enrichedHistoricText,
      notes: 'Vinculado manualmente pelo usuário e salvo na memória contábil.'
    };

    const updatedMatches = [newMatch, ...reconciliationResult.matches];
    const updatedMissingBank = reconciliationResult.missingInBank.filter(b => b.id !== bankItem.id);
    const updatedMissingSupplier = reconciliationResult.missingInSupplier.filter(s => s.id !== supplierItem.id);
    const reconciledCount = reconciliationResult.totalBankCount - updatedMissingBank.length;
    const rate = reconciliationResult.totalBankCount > 0 ? (reconciledCount / reconciliationResult.totalBankCount) * 100 : 0;

    set({
      reconciliationResult: {
        ...reconciliationResult,
        matches: updatedMatches,
        missingInBank: updatedMissingBank,
        missingInSupplier: updatedMissingSupplier,
        reconciledRate: rate
      }
    });

    addToast('✅ Lançamentos vinculados com sucesso! Regra De-Para salva.', 'success');
  },

  manualLink: () => {
    const { selectedBankItem, selectedSupplierItem, manualMatch } = get();
    if (selectedBankItem && selectedSupplierItem) {
      manualMatch(selectedBankItem, selectedSupplierItem);
      set({ selectedBankItem: null, selectedSupplierItem: null });
    }
  },

  // Manual Unlink
  removeMatch: (matchId) => {
    const { reconciliationResult, addToast } = get();
    if (!reconciliationResult) return;

    const matchToRemove = reconciliationResult.matches.find(m => m.id === matchId);
    if (!matchToRemove) return;

    const updatedMatches = reconciliationResult.matches.filter(m => m.id !== matchId);
    const updatedMissingBank = [...reconciliationResult.missingInBank, ...matchToRemove.bankItems];
    const updatedMissingSupplier = [...reconciliationResult.missingInSupplier, ...matchToRemove.supplierItems];
    const reconciledCount = reconciliationResult.totalBankCount - updatedMissingBank.length;
    const rate = reconciliationResult.totalBankCount > 0 ? (reconciledCount / reconciliationResult.totalBankCount) * 100 : 0;

    set({
      selectedMatch: null,
      reconciliationResult: {
        ...reconciliationResult,
        matches: updatedMatches,
        missingInBank: updatedMissingBank,
        missingInSupplier: updatedMissingSupplier,
        reconciledRate: rate
      }
    });

    addToast('Vínculo desfeito com sucesso.', 'info');
  },

  // Fiscal Invoices & Multi-Period XML Repository
  fiscalInvoices: [],
  setFiscalInvoices: (fiscalInvoices) => {
    const { activeCompany } = get();
    if (activeCompany) saveFiscalInvoices(activeCompany.id, fiscalInvoices);
    set({ fiscalInvoices });
  },
  addFiscalInvoices: (incomingList) => {
    const { fiscalInvoices, activeCompany, addToast } = get();
    const updated = mergeInvoices(fiscalInvoices, incomingList);
    if (activeCompany) saveFiscalInvoices(activeCompany.id, updated);
    set({ fiscalInvoices: updated });
    addToast(`📄 ${incomingList.length} notas fiscais importadas e consolidadas no repositório!`, 'success');
  },
  deleteFiscalInvoice: (invoiceId) => {
    const { fiscalInvoices, activeCompany, addToast } = get();
    const updated = fiscalInvoices.filter(i => i.id !== invoiceId);
    if (activeCompany) saveFiscalInvoices(activeCompany.id, updated);
    set({ fiscalInvoices: updated });
    addToast('Nota fiscal removida do repositório.', 'info');
  },
  clearFiscalInvoices: () => {
    const { activeCompany, addToast } = get();
    if (activeCompany) saveFiscalInvoices(activeCompany.id, []);
    set({ fiscalInvoices: [] });
    addToast('Repositório fiscal esvaziado.', 'info');
  },
  settleFiscalInstallment: (invoiceId, installmentNumber, settlementData) => {
    const { fiscalInvoices, activeCompany, addToast } = get();
    const updated = settleInstallmentInList(fiscalInvoices, invoiceId, installmentNumber, settlementData);
    if (activeCompany) saveFiscalInvoices(activeCompany.id, updated);
    set({ fiscalInvoices: updated });
    addToast('✅ Parcela marcada como quitada pelo banco!', 'success');
  },
  unsettleFiscalInstallment: (invoiceId, installmentNumber) => {
    const { fiscalInvoices, activeCompany, addToast } = get();
    const updated = unsettleInstallmentInList(fiscalInvoices, invoiceId, installmentNumber);
    if (activeCompany) saveFiscalInvoices(activeCompany.id, updated);
    set({ fiscalInvoices: updated });
    addToast('Parcela reaberta como pendente.', 'info');
  },

  // De-Para Transactions Table (Domínio Importer flow)
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
  updateTransaction: (index, updatedFields) => {
    const { transactions } = get();
    const next = [...transactions];
    if (next[index]) {
      next[index] = { ...next[index], ...updatedFields };
      set({ transactions: next });
    }
  },
  deleteTransaction: (index) => {
    const { transactions, addToast } = get();
    const next = transactions.filter((_, i) => i !== index);
    set({ transactions: next });
    addToast('Lançamento removido da tabela.', 'info');
  },
  sendReconciliationToTransactions: (customCounterpart = '') => {
    const { reconciliationResult, deParaRules, addToast } = get();
    if (!reconciliationResult) {
      addToast('Execute a conciliação antes de enviar os lançamentos.', 'warning');
      return;
    }

    const { matches = [], missingInBank = [] } = reconciliationResult;
    const allItems = [];

    // 1. Process matches with enriched supplier/NF history
    matches.forEach(m => {
      const b = (m.bankItems && m.bankItems[0]) || {};
      const s = (m.supplierItems && m.supplierItems[0]) || {};
      const rawDesc = b.description || 'Lançamento Bancário';
      let enrichedDesc = m.historicText || m.description || rawDesc;
      const isDebit = b.isDebit !== undefined ? b.isDebit : ((b.amount || m.amount || 0) < 0);
      if (isDebit && enrichedDesc.startsWith('RECEBIMENTO DE')) {
        enrichedDesc = enrichedDesc.replace(/^RECEBIMENTO DE/i, 'PAGAMENTO A');
      }
      const numVal = isDebit ? -Math.abs(m.amount || b.amount || 0) : Math.abs(m.amount || b.amount || 0);

      const ruleMatch = matchTransactionRule(enrichedDesc, numVal, deParaRules, customCounterpart, enrichedDesc, [m.date, enrichedDesc, numVal]);

      allItems.push({
        id: m.id || `match_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: m.date || b.date || '',
        description: enrichedDesc,
        originalDescription: rawDesc,
        supplierName: s.description || s.favorecido || s.razaoSocial || (m.supplierItems && m.supplierItems.map(si => si.description).filter(Boolean).join(', ')) || '',
        document: s.document || b.document || '',
        value: numVal,
        amount: Math.abs(numVal),
        debitAccount: (ruleMatch && ruleMatch.debitAccount) || m.debitAccount || '',
        creditAccount: (ruleMatch && ruleMatch.creditAccount) || m.creditAccount || '',
        historicCode: (ruleMatch && ruleMatch.historicCode) || m.historicCode || '10',
        historicText: (ruleMatch && ruleMatch.historicText) || enrichedDesc,
        isSuggested: !!ruleMatch,
        isReconciled: true,
        matchPass: m.passName || 'Conciliado'
      });
    });

    // 2. Process missing bank items
    missingInBank.forEach((b, idx) => {
      const rawDesc = b.description || 'Lançamento Pendente';
      const isDebit = b.isDebit !== undefined ? b.isDebit : ((b.amount || 0) < 0);
      const numVal = isDebit ? -Math.abs(b.amount || 0) : Math.abs(b.amount || 0);

      const ruleMatch = matchTransactionRule(rawDesc, numVal, deParaRules, customCounterpart, rawDesc, [b.date, rawDesc, numVal]);

      allItems.push({
        id: b.id || `pending_b_${idx}_${Date.now()}`,
        date: b.date || '',
        description: rawDesc,
        originalDescription: rawDesc,
        supplierName: '',
        document: b.document || '',
        value: numVal,
        amount: Math.abs(numVal),
        debitAccount: (ruleMatch && ruleMatch.debitAccount) || '',
        creditAccount: (ruleMatch && ruleMatch.creditAccount) || '',
        historicCode: (ruleMatch && ruleMatch.historicCode) || '10',
        historicText: (ruleMatch && ruleMatch.historicText) || rawDesc,
        isSuggested: !!ruleMatch,
        isReconciled: false,
        matchPass: 'Pendente Banco'
      });
    });

    // Settle matched fiscal installments in fiscalInvoices repository
    const { fiscalInvoices, activeCompany } = get();
    let updatedFiscal = [...fiscalInvoices];
    matches.forEach(m => {
      if (m.fiscalInvoiceId && m.installmentNumber) {
        const b = (m.bankItems && m.bankItems[0]) || {};
        updatedFiscal = settleInstallmentInList(updatedFiscal, m.fiscalInvoiceId, m.installmentNumber, {
          date: m.date || b.date,
          amount: m.amount || b.amount,
          bankTxId: b.id || m.id,
          bankDescription: b.description || 'Pagamento Bancário'
        });
      }
    });

    if (activeCompany && updatedFiscal.length > 0) {
      saveFiscalInvoices(activeCompany.id, updatedFiscal);
    }

    set({
      transactions: allItems,
      fiscalInvoices: updatedFiscal,
      activePage: 'transactions'
    });

    addToast(`🚀 ${allItems.length} lançamentos enviados para a aba de Lançamentos De-Para com quitação sincronizada!`, 'success');
  },

  // Upload Modals state
  mappingModalType: null,
  setMappingModalType: (type) => set({ mappingModalType: type }),
  pasteModalType: null,
  setPasteModalType: (type) => set({ pasteModalType: type }),
  diagnosticModalFile: null,
  setDiagnosticModalFile: (file) => set({ diagnosticModalFile: file }),

  // General App Modals state
  activeModal: null,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),

  // Diagnostics
  diagnosticLog: [],
  addDiagnosticLog: (msg) =>
    set(state => ({ diagnosticLog: [...state.diagnosticLog, `[${new Date().toLocaleTimeString()}] ${msg}`] })),
  clearDiagnosticLog: () => set({ diagnosticLog: [] }),

  // Toasts
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now() + Math.random();
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
}));

export default useAppStore;
