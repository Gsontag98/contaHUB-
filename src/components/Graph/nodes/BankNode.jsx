import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Landmark } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

function BankNode({ data, selected }) {
  const item = data.item || {};

  return (
    <div className={`graph-node node-bank ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <div className="node-title-group">
          <Landmark size={14} color="var(--bank-color)" />
          <span className="node-type-label">Extrato Banco</span>
        </div>
        <span className="node-date">{item.date?.split('-').reverse().join('/')}</span>
      </div>

      <div className="node-desc" title={item.description}>{item.description}</div>

      <div className="node-footer">
        <span className="node-amount" style={{ color: 'var(--bank-color)' }}>
          {formatCurrency(item.amount)}
        </span>
        {item.document && <span className="node-doc">Doc: {item.document}</span>}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(BankNode);
