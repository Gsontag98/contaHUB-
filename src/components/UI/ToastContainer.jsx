import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';

export default function ToastContainer() {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const getIcon = () => {
          switch (toast.type) {
            case 'success': return <CheckCircle2 size={18} />;
            case 'warning': return <AlertTriangle size={18} />;
            case 'error': return <AlertCircle size={18} />;
            default: return <Info size={18} />;
          }
        };

        return (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {getIcon()}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
