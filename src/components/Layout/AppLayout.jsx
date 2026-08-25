import Sidebar from './Sidebar.jsx';
import useAppStore from '../../store/useAppStore.js';
import { RotateCcw, Sparkles, Building2, ArrowLeftRight, LogOut } from 'lucide-react';

export default function AppLayout({ children }) {
  const { 
    activePage, 
    reconciliationResult, 
    clearFiles, 
    setActivePage, 
    addToast,
    activeCompany,
    clearActiveCompany,
    logout
  } = useAppStore();

  const getPageTitle = () => {
    switch (activePage) {
      case 'upload': return 'Importação & Mapeamento de Razões';
      case 'fiscal': return 'Controle Fiscal & XMLs (Notas e Parcelas)';
      case 'graph': return 'Painel de Conciliação Contábil';
      case 'transactions': return 'Lançamentos & Conciliação De-Para';
      case 'mapping': return 'Configuração de Layout da Planilha';
      case 'ocr': return 'OCR de Extratos & PDFs Escaneados';
      case 'plano': return 'Plano de Contas da Empresa';
      case 'rules': return 'Regras De-Para Contábeis';
      case 'report': return 'Relatório Executivo & Exportação Domínio';
      case 'settings': return 'Configurações de Inteligência Artificial';
      default: return 'contaHUB';
    }
  };

  const handleNewReconciliation = () => {
    clearFiles();
    setActivePage('upload');
    addToast('Nova conciliação iniciada. Envie os novos arquivos.', 'info');
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-wrapper">
        <header className="top-header">
          <div className="page-title-area" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <h2 className="page-title">{getPageTitle()}</h2>
            
            {/* Active Company Pill */}
            {activeCompany && (
              <div 
                className="header-company-pill"
                title={`Empresa ativa: ${activeCompany.name} | CNPJ: ${activeCompany.cnpj || 'Não informado'}`}
              >
                <Building2 size={15} color="var(--accent-cyan)" />
                <span className="header-company-name">{activeCompany.name}</span>
                <button 
                  className="btn-switch-company"
                  onClick={clearActiveCompany}
                  title="Trocar de Empresa"
                >
                  <ArrowLeftRight size={13} />
                  <span>Trocar</span>
                </button>
              </div>
            )}
          </div>

          <div className="header-actions">
            {reconciliationResult && (
              <button className="btn btn-secondary btn-sm" onClick={handleNewReconciliation}>
                <RotateCcw size={15} /> Nova Conciliação
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--accent-cyan)', background: 'var(--accent-glow)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(45, 212, 191, 0.3)' }}>
              <Sparkles size={13} />
              <span>Engine Especialista 7 Passos Ativo</span>
            </div>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={logout}
              title="Encerrar Sessão"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px' }}
            >
              <LogOut size={14} />
              <span>Sair</span>
            </button>
          </div>
        </header>

        <div className="content-container">
          {children}
        </div>
      </main>
    </div>
  );
}
