import React from 'react';
import AppLayout from './components/Layout/AppLayout.jsx';
import LoginScreen from './components/Auth/LoginScreen.jsx';
import CompanySelector from './components/Company/CompanySelector.jsx';
import UploadPage from './components/Upload/UploadPage.jsx';
import GraphStats from './components/Graph/GraphStats.jsx';
import GraphToolbar from './components/Graph/GraphToolbar.jsx';
import TableView from './components/Graph/TableView.jsx';
import ClassicGridView from './components/Graph/ClassicGridView.jsx';
import ReconciliationGraph from './components/Graph/ReconciliationGraph.jsx';
import ConciliationTable from './components/Conciliation/ConciliationTable.jsx';
import FiscalControlPanel from './components/Fiscal/FiscalControlPanel.jsx';
import MappingPanel from './components/LayoutMapping/MappingPanel.jsx';
import MatchDetailPanel from './components/DetailPanel/MatchDetailPanel.jsx';
import OcrPanel from './components/OCR/OcrPanel.jsx';
import PlanoContasPanel from './components/Plano/PlanoContasPanel.jsx';
import RulesPanel from './components/Rules/RulesPanel.jsx';
import ReportPage from './components/Report/ReportPage.jsx';
import AIConfigPanel from './components/Settings/AIConfigPanel.jsx';
import DeParaModal from './components/Settings/DeParaModal.jsx';
import ExportModal from './components/Export/ExportModal.jsx';
import ToastContainer from './components/UI/ToastContainer.jsx';
import useAppStore from './store/useAppStore.js';

export default function App() {
  const { 
    isAuthenticated, 
    activeCompany, 
    activePage, 
    viewMode, 
    reconciliationResult, 
    activeModal, 
    closeModal 
  } = useAppStore();

  // 1. Guard: Authentication check
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        <ToastContainer />
      </>
    );
  }

  // 2. Guard: Active Company selection check
  if (!activeCompany) {
    return (
      <>
        <CompanySelector />
        <ToastContainer />
      </>
    );
  }

  // 3. Main Workspace Navigation
  const renderContent = () => {
    switch (activePage) {
      case 'upload':
        return <UploadPage />;

      case 'fiscal':
        return <FiscalControlPanel />;

      case 'graph':
        if (!reconciliationResult) return <UploadPage />;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GraphStats />
            <GraphToolbar />
            {viewMode === 'table' ? (
              <TableView />
            ) : viewMode === 'grid' ? (
              <ClassicGridView />
            ) : (
              <ReconciliationGraph />
            )}
          </div>
        );

      case 'transactions':
        return <ConciliationTable />;

      case 'mapping':
        return <MappingPanel />;

      case 'ocr':
        return <OcrPanel />;

      case 'plano':
        return <PlanoContasPanel />;

      case 'rules':
        return <RulesPanel />;

      case 'report':
        return <ReportPage />;

      case 'settings':
        return <AIConfigPanel />;

      default:
        return <UploadPage />;
    }
  };

  return (
    <AppLayout>
      {renderContent()}
      <MatchDetailPanel />
      <DeParaModal />
      <ExportModal isOpen={activeModal === 'export'} onClose={closeModal} />
      <ToastContainer />
    </AppLayout>
  );
}
