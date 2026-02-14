import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { api } from '../../services/api';

interface HealthMetric {
  mood: number;
  energy: number;
  sleep: number;
  exercise: number;
  date: string;
}

interface HealthExperiment {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'paused';
  metrics_tracked: string[];
}

type TabType = 'daily-log' | 'trends' | 'history';

const MOOD_LABELS = ['Stressed', 'Low', 'Neutral', 'Good', 'Calm', 'Zen'];
const ENERGY_LABELS = ['Drained', 'Low', 'Moderate', 'Good', 'Vibrant', 'High'];

export function Wellbeing() {
  const [activeTab, setActiveTab] = useState<TabType>('daily-log');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [mood, setMood] = useState(8);
  const [energy, setEnergy] = useState(9);
  const [sleep, setSleep] = useState(7.5);
  const [exercise, setExercise] = useState(45);

  // Data state
  const [, setCurrentMetrics] = useState<HealthMetric | null>(null);
  const [historicalData, setHistoricalData] = useState<HealthMetric[]>([]);
  const [experiments, setExperiments] = useState<HealthExperiment[]>([]);

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load trends and today's data from API
      const [trendsRes, todayRes, expRes] = await Promise.all([
        api.getHealthTrends(14).catch(() => ({ trends: [], averages: {} })),
        api.getHealthToday().catch(() => ({ log: null })),
        api.getExperiments().catch(() => ({ experiments: [] })),
      ]);

      // Map API data to frontend format
      const mapped: HealthMetric[] = (trendsRes as any).trends.map((t: any) => ({
        date: t.date,
        mood: t.mood || 5,
        energy: t.energy || 5,
        sleep: t.sleep_hours || 7,
        exercise: t.exercise_minutes || 0,
      }));
      setHistoricalData(mapped);

      // Set current metrics from today's log
      const todayLog = (todayRes as any).log;
      if (todayLog) {
        setCurrentMetrics({
          date: todayLog.date,
          mood: todayLog.mood,
          energy: todayLog.energy,
          sleep: todayLog.sleep_hours,
          exercise: todayLog.exercise_minutes,
        });
        setMood(todayLog.mood);
        setEnergy(todayLog.energy);
        setSleep(todayLog.sleep_hours);
        setExercise(todayLog.exercise_minutes);
      }

      // Set experiments from API
      setExperiments((expRes as any).experiments || []);
    } catch (err) {
      console.error('Failed to load health data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load health data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.saveHealthLog({
        mood,
        energy,
        sleep_hours: sleep,
        exercise_minutes: exercise,
        date: new Date().toISOString().split('T')[0],
      });

      await loadHealthData();
    } catch (err) {
      console.error('Failed to save health log:', err);
      setError(err instanceof Error ? err.message : 'Failed to save health metrics');
    } finally {
      setLoading(false);
    }
  };

  const getMoodLabel = (value: number): string => {
    const index = Math.min(Math.floor((value - 1) / 2), MOOD_LABELS.length - 1);
    return MOOD_LABELS[Math.max(0, index)];
  };

  const getEnergyLabel = (value: number): string => {
    const index = Math.min(Math.floor((value - 1) / 2), ENERGY_LABELS.length - 1);
    return ENERGY_LABELS[Math.max(0, index)];
  };

  const calculateAverage = (key: keyof HealthMetric): number => {
    if (historicalData.length === 0) return 0;
    const sum = historicalData.reduce((acc, curr) => {
      const val = curr[key];
      return acc + (typeof val === 'number' ? val : 0);
    }, 0);
    return sum / historicalData.length;
  };

  const calculateChange = (current: number, key: keyof HealthMetric): string => {
    const avg = calculateAverage(key);
    if (avg === 0) return 'Stable';
    const change = ((current - avg) / avg) * 100;
    if (Math.abs(change) < 2) return 'Stable';
    return `${change > 0 ? '+' : ''}${change.toFixed(0)}% from avg`;
  };

  const formatDate = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    return `${months[now.getMonth()]} ${now.getDate()}${getDaySuffix(now.getDate())}`;
  };

  const getDaySuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] w-full mx-auto flex flex-col gap-8" data-testid="wellbeing">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Health & Vitality
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base font-normal">
            Track your balance for today, {formatDate()}.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            data-testid="btn-select-date"
          >
            <span className="material-symbols-outlined text-lg">calendar_month</span>
            Select Date
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-blue-600 text-sm font-medium text-white transition-colors shadow-lg shadow-primary/20"
            data-testid="btn-export-report"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Export Report
          </button>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3"
          data-testid="error-message"
        >
          <span className="material-symbols-outlined text-red-500">error</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900 dark:text-red-200">Error</p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
          <button
            onClick={loadHealthData}
            className="text-sm font-semibold text-red-700 dark:text-red-300 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Sleep Card */}
        <div
          className="flex flex-col justify-between p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card-dark hover:border-primary/30 transition-colors group"
          data-testid="metric-sleep"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Sleep</p>
              <p className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">
                {sleep.toFixed(1)} <span className="text-base text-slate-500 dark:text-slate-400 font-normal">hrs</span>
              </p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
              <span className="material-symbols-outlined text-teal-500">bedtime</span>
            </div>
          </div>
          <div className="h-12 w-full" style={{ minHeight: '48px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData.slice(-7)}>
                <defs>
                  <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="sleep" stroke="#14b8a6" strokeWidth={2} fill="url(#colorSleep)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-teal-500 text-xs font-medium mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            {calculateChange(sleep, 'sleep')}
          </p>
        </div>

        {/* Exercise Card */}
        <div
          className="flex flex-col justify-between p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card-dark hover:border-primary/30 transition-colors group"
          data-testid="metric-exercise"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Exercise</p>
              <p className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">
                {exercise} <span className="text-base text-slate-500 dark:text-slate-400 font-normal">mins</span>
              </p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
              <span className="material-symbols-outlined text-primary">directions_run</span>
            </div>
          </div>
          <div className="h-12 w-full" style={{ minHeight: '48px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData.slice(-7)}>
                <Line type="stepAfter" dataKey="exercise" stroke="#137fec" strokeWidth={2} dot={{ fill: '#137fec', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-primary text-xs font-medium mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            {calculateChange(exercise, 'exercise')}
          </p>
        </div>

        {/* Mood Card */}
        <div
          className="flex flex-col justify-between p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card-dark hover:border-primary/30 transition-colors group"
          data-testid="metric-mood"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Mood</p>
              <p className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">
                {getMoodLabel(mood)}
              </p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
              <span className="material-symbols-outlined text-purple-400">psychology</span>
            </div>
          </div>
          <div className="h-12 w-full" style={{ minHeight: '48px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData.slice(-7)}>
                <defs>
                  <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="natural" dataKey="mood" stroke="#c084fc" strokeWidth={2} fill="url(#colorMood)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">remove</span>
            {calculateChange(mood, 'mood')}
          </p>
        </div>

        {/* Energy Card */}
        <div
          className="flex flex-col justify-between p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card-dark hover:border-primary/30 transition-colors group"
          data-testid="metric-energy"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Energy</p>
              <p className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">
                {getEnergyLabel(energy)}
              </p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
              <span className="material-symbols-outlined text-yellow-400">bolt</span>
            </div>
          </div>
          <div className="h-12 w-full" style={{ minHeight: '48px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData.slice(-7)}>
                <Line type="monotone" dataKey="energy" stroke="#facc15" strokeWidth={2} dot={{ fill: '#facc15', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-teal-500 text-xs font-medium mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            {calculateChange(energy, 'energy')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-8 px-2">
          <button
            onClick={() => setActiveTab('daily-log')}
            className={`relative pb-4 pt-2 text-sm tracking-wide font-semibold transition-colors ${
              activeTab === 'daily-log'
                ? 'text-primary'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            data-testid="tab-daily-log"
          >
            Daily Log
            {activeTab === 'daily-log' && (
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-sm"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`relative pb-4 pt-2 text-sm tracking-wide font-semibold transition-colors ${
              activeTab === 'trends'
                ? 'text-primary'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            data-testid="tab-trends"
          >
            Trends
            {activeTab === 'trends' && (
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-sm"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`relative pb-4 pt-2 text-sm tracking-wide font-semibold transition-colors ${
              activeTab === 'history'
                ? 'text-primary'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            data-testid="tab-history"
          >
            History
            {activeTab === 'history' && (
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-sm"></span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'daily-log' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight px-1">
              How are you feeling today?
            </h3>

            {/* Metric Inputs Container */}
            <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-8">
              {/* Sliders Section */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* Mood Slider */}
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-end">
                    <label className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                      Mood Level
                    </label>
                    <span className="text-slate-900 dark:text-white font-bold text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {getMoodLabel(mood)}
                    </span>
                  </div>
                  <div className="relative h-10 flex items-center">
                    <span className="absolute left-0 text-xs text-slate-400 bottom-[-20px]">Stressed</span>
                    <span className="absolute right-0 text-xs text-slate-400 bottom-[-20px]">Zen</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={mood}
                      onChange={(e) => setMood(Number(e.target.value))}
                      className="w-full accent-primary focus:outline-none focus:ring-0"
                      data-testid="input-mood"
                    />
                  </div>
                </div>

                {/* Energy Slider */}
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-end">
                    <label className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                      Energy Level
                    </label>
                    <span className="text-slate-900 dark:text-white font-bold text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {getEnergyLabel(energy)}
                    </span>
                  </div>
                  <div className="relative h-10 flex items-center">
                    <span className="absolute left-0 text-xs text-slate-400 bottom-[-20px]">Drained</span>
                    <span className="absolute right-0 text-xs text-slate-400 bottom-[-20px]">High</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={energy}
                      onChange={(e) => setEnergy(Number(e.target.value))}
                      className="w-full accent-primary focus:outline-none focus:ring-0"
                      data-testid="input-energy"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-200 dark:border-slate-700 w-full"></div>

              {/* Number Inputs Section */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* Sleep Input */}
                <div className="flex flex-col gap-3">
                  <label className="text-slate-500 dark:text-slate-400 text-sm font-medium flex gap-2 items-center">
                    <span className="material-symbols-outlined text-base">bedtime</span>
                    Sleep Duration (Hrs)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSleep(Math.max(0, sleep - 0.5))}
                      className="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white flex items-center justify-center transition-colors"
                      data-testid="btn-sleep-decrease"
                    >
                      <span className="material-symbols-outlined text-lg">remove</span>
                    </button>
                    <div className="flex-1 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-900 dark:text-white font-bold">
                      {sleep.toFixed(1)}
                    </div>
                    <button
                      onClick={() => setSleep(Math.min(24, sleep + 0.5))}
                      className="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white flex items-center justify-center transition-colors"
                      data-testid="btn-sleep-increase"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                    </button>
                  </div>
                </div>

                {/* Exercise Input */}
                <div className="flex flex-col gap-3">
                  <label className="text-slate-500 dark:text-slate-400 text-sm font-medium flex gap-2 items-center">
                    <span className="material-symbols-outlined text-base">directions_run</span>
                    Exercise (Mins)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExercise(Math.max(0, exercise - 5))}
                      className="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white flex items-center justify-center transition-colors"
                      data-testid="btn-exercise-decrease"
                    >
                      <span className="material-symbols-outlined text-lg">remove</span>
                    </button>
                    <div className="flex-1 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-900 dark:text-white font-bold">
                      {exercise}
                    </div>
                    <button
                      onClick={() => setExercise(Math.min(300, exercise + 5))}
                      className="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white flex items-center justify-center transition-colors"
                      data-testid="btn-exercise-increase"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-primary hover:bg-blue-600 disabled:bg-slate-400 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                  data-testid="btn-save-log"
                >
                  <span className="material-symbols-outlined">save</span>
                  {loading ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </div>
          </div>

          {/* Coach Nudges Column */}
          <div className="flex flex-col gap-6">
            <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight px-1">
              Coach Nudges
            </h3>
            <div className="flex flex-col gap-4">
              {/* Nudge 1 */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-teal-500/20 rounded-xl p-5 relative overflow-hidden group">
                <div className="flex items-start gap-4 z-10 relative">
                  <div className="size-10 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-teal-500">water_drop</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-slate-900 dark:text-white font-semibold text-sm">Hydration Check</p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      You haven't logged water in 4 hours. Time for a glass?
                    </p>
                    <button className="mt-3 text-xs font-medium text-teal-500 hover:text-teal-600 dark:hover:text-white transition-colors self-start flex items-center gap-1">
                      Log Water <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Nudge 2 */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-blue-500/20 rounded-xl p-5 relative overflow-hidden group">
                <div className="flex items-start gap-4 z-10 relative">
                  <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">directions_walk</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-slate-900 dark:text-white font-semibold text-sm">Movement Break</p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      It's a beautiful afternoon. A 10-minute walk could boost your energy by 20%.
                    </p>
                    <button className="mt-3 text-xs font-medium text-primary hover:text-blue-600 dark:hover:text-white transition-colors self-start flex items-center gap-1">
                      I'll go now <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quote Card */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center text-center gap-3">
                <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-3xl">
                  format_quote
                </span>
                <p className="text-slate-600 dark:text-slate-400 text-sm italic">
                  "Rest and self-care are so important. When you take time to replenish your spirit, it allows you to serve others from the overflow."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="flex flex-col gap-6">
          <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight px-1">
            Health Trends (Last 14 Days)
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sleep Trend */}
            <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h4 className="text-slate-900 dark:text-white font-semibold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500">bedtime</span>
                Sleep Duration
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="trendSleep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => new Date(val).getDate().toString()} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Area type="monotone" dataKey="sleep" stroke="#14b8a6" strokeWidth={2} fill="url(#trendSleep)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Exercise Trend */}
            <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h4 className="text-slate-900 dark:text-white font-semibold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">directions_run</span>
                Exercise Minutes
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => new Date(val).getDate().toString()} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Line type="monotone" dataKey="exercise" stroke="#137fec" strokeWidth={2} dot={{ fill: '#137fec', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Mood Trend */}
            <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h4 className="text-slate-900 dark:text-white font-semibold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">psychology</span>
                Mood Level
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="trendMood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c084fc" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => new Date(val).getDate().toString()} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[1, 10]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Area type="natural" dataKey="mood" stroke="#c084fc" strokeWidth={2} fill="url(#trendMood)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Energy Trend */}
            <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h4 className="text-slate-900 dark:text-white font-semibold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-400">bolt</span>
                Energy Level
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => new Date(val).getDate().toString()} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[1, 10]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Line type="monotone" dataKey="energy" stroke="#facc15" strokeWidth={2} dot={{ fill: '#facc15', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="flex flex-col gap-6">
          <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight px-1">
            Health Experiments
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {experiments.map((experiment) => (
              <div
                key={experiment.id}
                className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-primary/30 transition-colors"
                data-testid={`experiment-${experiment.id}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-slate-900 dark:text-white font-semibold text-base">
                    {experiment.title}
                  </h4>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    experiment.status === 'active'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {experiment.status}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                  {experiment.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                    {new Date(experiment.start_date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">monitoring</span>
                    {experiment.metrics_tracked.join(', ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
