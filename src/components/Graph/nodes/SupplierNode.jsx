import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Building2 } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

function SupplierNode({ data, selected }) {
  const item = data.item || {};

  return (
    <div className={`graph-node node-supplier ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />

      <div className="node-header">
        <div className="node-title-group">
          <Building2 size={14} color="var(--supplier-color)" />
          <span className="node-type-label">Razão Fornecedor</span>
        </div>
        <span className="node-date">{item.date?.split('-').reverse().join('/')}</span>
      </div>

      <div className="node-desc" title={item.description}>{item.description}</div>

      <div className="node-footer">
        <span className="node-amount" style={{ color: 'var(--supplier-color)' }}>
          {formatCurrency(item.amount)}
        </span>
        {item.document && <span className="node-doc">Doc: {item.document}</span>}
      </div>
    </div>
  );
}

export default memo(SupplierNode);
