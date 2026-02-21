import Calendar from '../Calendar/Calendar';

export default function CalendarCanvas() {
  return (
    <div data-testid="canvas-calendar" className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">CALENDAR</h2>
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary tracking-tight mt-1"
            style={{ fontFamily: 'var(--font-body)' }}>Your Week</h1>
      </div>
      <Calendar />
    </div>
  );
}
