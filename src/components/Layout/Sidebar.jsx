import {
  UploadCloud,
  Network,
  Sparkles,
  BookOpen,
  Settings,
  FileSpreadsheet,
  Cpu,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';

export default function Sidebar() {
  const {
    activePage,
    setActivePage,
    theme,
    setTheme,
    sidebarCollapsed,
    setSidebarCollapsed,
    reconciliationResult
  } = useAppStore();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navItems = [
    { id: 'upload', label: 'Importar Arquivos', icon: UploadCloud },
    { id: 'graph', label: 'Visão & Auditoria', icon: Network, disabled: !reconciliationResult },
    { id: 'transactions', label: 'Lançamentos (De-Para)', icon: FileSpreadsheet },
    { id: 'mapping', label: 'Configurar Layout', icon: SlidersHorizontal },
    { id: 'ocr', label: 'OCR Extratos & PDFs', icon: Sparkles },
    { id: 'plano', label: 'Plano de Contas', icon: BookOpen },
    { id: 'rules', label: 'Regras De-Para', icon: Settings },
    { id: 'settings', label: 'Configurações IA', icon: Cpu }
  ];

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!sidebarCollapsed && (
          <div className="brand">
            <img src="./logo_contahub.svg" alt="contaHUB Logo" className="brand-logo" />
            <span className="brand-text">contaHUB</span>
          </div>
        )}
        <button
          className="btn-icon collapse-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
              onClick={() => !item.disabled && setActivePage(item.id)}
              disabled={item.disabled}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon size={18} className="nav-icon" />
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
              {!sidebarCollapsed && item.id === 'graph' && reconciliationResult && (
                <span className="nav-badge">
                  {reconciliationResult.reconciledRate.toFixed(0)}%
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          className="btn-icon theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {!sidebarCollapsed && (
          <span className="theme-label" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </span>
        )}
      </div>
    </aside>
  );
}
