import { memo } from 'react';
import { getBezierPath } from '@xyflow/react';

function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const confidence = data?.confidence || 100;
  const strokeColor = confidence === 100 ? '#10B981' : confidence >= 90 ? '#2DD4BF' : '#F59E0B';

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: 2.5
        }}
        className="react-flow__edge-path animated-edge"
        d={edgePath}
      />
      {data?.passName && (
        <text
          x={labelX}
          y={labelY - 10}
          textAnchor="middle"
          style={{
            fill: 'var(--text-secondary)',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700
          }}
        >
          {data.passName}
        </text>
      )}
    </>
  );
}

export default memo(AnimatedEdge);
