import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../../styles/graph.css';
import { Compass, Move } from 'lucide-react';

import BankNode from './nodes/BankNode.jsx';
import SupplierNode from './nodes/SupplierNode.jsx';
import AnimatedEdge from './edges/AnimatedEdge.jsx';
import useAppStore from '../../store/useAppStore.js';

const nodeTypes = {
  bankNode: BankNode,
  supplierNode: SupplierNode
};

const edgeTypes = {
  animatedEdge: AnimatedEdge
};

export default function ReconciliationGraph() {
  const { reconciliationResult, setSelectedMatch } = useAppStore();

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!reconciliationResult) return { initialNodes: [], initialEdges: [] };

    const { matches = [], missingInBank = [], missingInSupplier = [] } = reconciliationResult;

    const nodes = [];
    const edges = [];

    let leftY = 40;
    let rightY = 40;
    const ySpacing = 115;

    // 1. Process Matches (Matched pairs)
    matches.forEach(m => {
      const bItem = m.bankItems[0] || {};
      const sItem = m.supplierItems[0] || {};

      const bNodeId = `node_${bItem.id}`;
      const sNodeId = `node_${sItem.id}`;

      nodes.push({
        id: bNodeId,
        type: 'bankNode',
        position: { x: 80, y: leftY },
        data: { item: bItem, matchId: m.id }
      });

      nodes.push({
        id: sNodeId,
        type: 'supplierNode',
        position: { x: 680, y: rightY },
        data: { item: sItem, matchId: m.id }
      });

      edges.push({
        id: `edge_${m.id}`,
        type: 'animatedEdge',
        source: bNodeId,
        target: sNodeId,
        data: {
          confidence: m.confidence,
          passName: m.passName
        }
      });

      leftY += ySpacing;
      rightY += ySpacing;
    });

    // 2. Unmatched Bank Items (left side)
    missingInBank.forEach(b => {
      nodes.push({
        id: `node_${b.id}`,
        type: 'bankNode',
        position: { x: 80, y: leftY },
        data: { item: b, unmatched: true }
      });
      leftY += ySpacing;
    });

    // 3. Unmatched Supplier Items (right side)
    missingInSupplier.forEach(s => {
      nodes.push({
        id: `node_${s.id}`,
        type: 'supplierNode',
        position: { x: 680, y: rightY },
        data: { item: s, unmatched: true }
      });
      rightY += ySpacing;
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [reconciliationResult]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((event, node) => {
    if (!reconciliationResult) return;
    const matchId = node.data?.matchId;
    if (matchId) {
      const match = reconciliationResult.matches.find(m => m.id === matchId);
      if (match) setSelectedMatch(match);
    }
  }, [reconciliationResult, setSelectedMatch]);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 270px)', minHeight: '540px', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.18, duration: 400 }}
        minZoom={0.15}
        maxZoom={2.0}
        panOnDrag={true}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={true}
        nodesDraggable={true}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1B3D40" gap={22} size={1.2} />
        <Controls showInteractive={false} />
        
        {/* Interactive Pannable & Zoomable Minimap */}
        <MiniMap
          pannable={true}
          zoomable={true}
          nodeColor={(n) => (n.type === 'bankNode' ? '#06B6D4' : '#10B981')}
          maskColor="rgba(8, 20, 22, 0.75)"
          nodeStrokeColor="#0B1A1C"
          nodeStrokeWidth={2}
          nodeBorderRadius={4}
          style={{
            background: 'rgba(11, 26, 28, 0.95)',
            border: '1.5px solid var(--accent-cyan)',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            cursor: 'grab'
          }}
        />

        {/* Dynamic Navigation Tip Pill */}
        <Panel position="top-left" style={{ margin: '12px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'rgba(11, 26, 28, 0.88)', 
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)', 
            padding: '6px 14px', 
            borderRadius: 'var(--radius-full)', 
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Move size={14} color="var(--accent-cyan)" />
            <span>Arraste o <strong>fundo da tela</strong> com o mouse para navegar, dê zoom com a rodinha e use o <strong>MiniMapa</strong> livremente!</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
