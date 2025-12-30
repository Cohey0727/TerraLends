import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ResourceNode } from './ResourceNode';
import type { ParsedPlan, ResourceNode as ResourceNodeType } from '../types/terraform';
import { toReactFlowElements } from '../utils/parsePlan';

interface GraphViewProps {
  plan: ParsedPlan;
  onNodeSelect: (resource: ResourceNodeType | null) => void;
  selectedId: string | null;
}

const nodeTypes = {
  resourceNode: ResourceNode,
};

const miniMapNodeColor = (node: { data?: { resource?: { action?: string } } }) => {
  const action = node.data?.resource?.action;
  switch (action) {
    case 'create':
      return '#22c55e';
    case 'update':
      return '#eab308';
    case 'delete':
      return '#ef4444';
    case 'read':
      return '#3b82f6';
    default:
      return '#9ca3af';
  }
};

export function GraphView({ plan, onNodeSelect, selectedId }: GraphViewProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => toReactFlowElements(plan),
    [plan]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // 選択状態を反映
  useMemo(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === selectedId,
      }))
    );
  }, [selectedId, setNodes]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const resource = (node.data as { resource: ResourceNodeType }).resource;
      onNodeSelect(resource);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
        <MiniMap
          nodeColor={miniMapNodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
      </ReactFlow>
    </div>
  );
}
