import { useCanvasStore } from '../../stores/canvas';
import {
  GlassCard, Badge, StatCard, ConfidenceRing, StatusChip,
  ExpandableText, GaugeRing, ApprovalBar, Drawer,
} from '../shared';
import { useState } from 'react';

const LONG_TEXT = `This is a sample assessment text that demonstrates the ExpandableText component. It contains enough content to overflow past three lines of text, which should trigger the "Read more" toggle. The council evaluator has analyzed the project across multiple dimensions including market viability, technical feasibility, competitive positioning, and revenue potential. The overall assessment is cautiously optimistic, with several areas requiring further investigation before a final recommendation can be made. Key considerations include the need for market validation through customer interviews and the importance of establishing a clear competitive moat early in the development process.`;

export default function UIKitCanvas() {
  const { goBack } = useCanvasStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div data-testid="canvas-ui-kit" className="p-6 lg:p-8 max-w-6xl mx-auto">
      <button
        onClick={goBack}
        className="text-text-tertiary hover:text-text-primary text-sm mb-3 flex items-center gap-1 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h2 className="text-xs font-semibold tracking-wider uppercase text-text-tertiary mb-1">DESIGN SYSTEM</h2>
      <h1 className="text-2xl font-bold text-text-primary mb-8">UI Kit</h1>

      <div className="space-y-8">
        {/* StatusChip */}
        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">StatusChip</h3>
          <div className="flex flex-wrap gap-3">
            <StatusChip label="Active" variant="success" />
            <StatusChip label="Caution" variant="warning" />
            <StatusChip label="Error" variant="danger" />
            <StatusChip label="Info" variant="info" pulse />
            <StatusChip label="Neutral" variant="neutral" />
          </div>
        </GlassCard>

        {/* ExpandableText */}
        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">ExpandableText</h3>
          <div className="max-w-lg">
            <ExpandableText text={LONG_TEXT} maxLines={3} />
          </div>
        </GlassCard>

        {/* GaugeRing */}
        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">GaugeRing</h3>
          <div className="flex items-end gap-8">
            <GaugeRing value={72} label="Progress" size="sm" color="primary" />
            <GaugeRing value={85} label="Health" sublabel="Good" size="md" color="success" />
            <GaugeRing value={45} label="Risk" sublabel="Medium" size="lg" color="gradient" />
          </div>
        </GlassCard>

        {/* ApprovalBar */}
        <div>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">ApprovalBar</h3>
          <ApprovalBar
            message="Council evaluation complete. Composite score 7.2/10 — recommend proceeding with caution on market validation."
            onApprove={() => {}}
            onViewThread={() => {}}
          />
        </div>

        {/* Drawer */}
        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Drawer</h3>
          <button
            onClick={() => setDrawerOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
          >
            Open Drawer
          </button>
          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Sample Drawer">
            <div className="space-y-4">
              <p className="text-text-secondary text-sm">This is the Drawer component. It slides in from the right with a glass backdrop.</p>
              <div className="flex flex-wrap gap-2">
                <StatusChip label="Tag A" variant="info" />
                <StatusChip label="Tag B" variant="success" />
              </div>
              <GaugeRing value={68} label="Sample Metric" size="md" color="gradient" />
            </div>
          </Drawer>
        </GlassCard>

        {/* Existing components reference */}
        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Existing Components</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <StatCard value="312" label="Total Contacts" />
            <StatCard value="7.4" label="Avg Score" />
            <StatCard value="12" label="Opportunities" />
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge label="ACTIVE" variant="active" />
            <Badge label="PAUSED" variant="paused" />
            <Badge label="BLOCKED" variant="blocked" />
            <Badge label="COMPLETED" variant="completed" />
            <Badge label="PLAYBOOK" variant="playbook" />
            <Badge label="COUNCIL" variant="council" />
          </div>
          <div className="flex gap-4">
            <ConfidenceRing score={8.5} size="sm" />
            <ConfidenceRing score={5.2} size="md" />
            <ConfidenceRing score={3.1} size="xl" />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
