import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../api/client';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  Percent,
  TrendingUp,
  Plus,
  RefreshCw,
  ArrowRight,
  Flame,
  ShoppingBag,
  AlertCircle
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export const DashboardPage = () => {
  const { user, token } = useAuth();

  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [competitors, setCompetitors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setError('');
    try {
      const [statsRes, tasksRes, compRes] = await Promise.all([
        api.getTaskStats(),
        api.getTasks(),
        api.getFoodDeliveryInsights().catch(() => ({ data: { competitors: {} } })),
      ]);

      setStats(statsRes.data);
      setTasks(tasksRes.data.tasks || []);
      setCompetitors(compRes.data.competitors || {});
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const doughnutData = {
    labels: ['Completed', 'Pending'],
    datasets: [
      {
        data: [stats?.completed_tasks || 0, stats?.pending_tasks || 0],
        backgroundColor: ['#10b981', '#f59e0b'],
        borderWidth: 0,
      },
    ],
  };

  const zomatoLikes = competitors?.Zomato?.good_features?.length || 0;
  const zomatoDislikes = competitors?.Zomato?.bad_features?.length || 0;
  const swiggyLikes = competitors?.Swiggy?.good_features?.length || 0;
  const swiggyDislikes = competitors?.Swiggy?.bad_features?.length || 0;

  const competitorBarData = {
    labels: ['Zomato Likes', 'Zomato Complaints', 'Swiggy Likes', 'Swiggy Complaints'],
    datasets: [
      {
        label: 'Extracted Feedback Points',
        data: [zomatoLikes, zomatoDislikes, swiggyLikes, swiggyDislikes],
        backgroundColor: ['#10b981', '#ef4444', '#10b981', '#f97316'],
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="space-y-8">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.username}
          </h1>
          <p className="text-sm text-slate-700 mt-1">
            Real-time overview of your research tasks and market sentiment intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/tasks"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Tasks"
          value={loading ? '...' : stats?.total_tasks || 0}
          subtitle="All created workspace items"
          icon={CheckSquare}
          color="indigo"
        />
        <StatCard
          title="Pending Tasks"
          value={loading ? '...' : stats?.pending_tasks || 0}
          subtitle="Active items in progress"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Completed Tasks"
          value={loading ? '...' : stats?.completed_tasks || 0}
          subtitle="Successfully closed items"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Completion Rate"
          value={loading ? '...' : `${stats?.completion_percentage || 0}%`}
          subtitle="Progress towards goal"
          icon={Percent}
          color="blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Progress Doughnut */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col">
          <h2 className="text-base font-bold text-slate-900">Task Completion Ratio</h2>
          <p className="text-xs text-slate-700 mt-0.5">Ratio of pending vs completed tasks</p>

          <div className="flex-1 flex items-center justify-center p-4 min-h-[220px]">
            {stats?.total_tasks > 0 ? (
              <div className="w-48 h-48">
                <Doughnut
                  data={doughnutData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
                  }}
                />
              </div>
            ) : (
              <div className="text-center text-slate-600 py-8">
                <CheckSquare className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-medium">No tasks recorded yet</p>
                <Link to="/tasks" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                  Create your first task
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Competitor Overview Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Competitor Sentiment Highlights</h2>
              <p className="text-xs text-slate-700 mt-0.5">Likes vs Complaints extracted from real customer reviews</p>
            </div>
            <Link
              to="/analysis/comparison"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Deep Dive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[220px]">
            {competitors && Object.keys(competitors).length > 0 ? (
              <div className="w-full h-56">
                <Bar
                  data={competitorBarData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                      x: { grid: { display: false } },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="text-center text-slate-600">
                <TrendingUp className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-sm">Loading market intelligence...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tasks List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Workspace Tasks</h2>
            <p className="text-xs text-slate-700 mt-0.5">Your latest active research items</p>
          </div>
          <Link
            to="/tasks"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>View All Tasks ({tasks.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {tasks.length > 0 ? (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.task_id} className="p-4 sm:px-6 hover:bg-slate-50/70 transition flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-slate-600">#{task.task_id}</span>
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{task.title}</h3>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="text-xs text-slate-700 mt-1 truncate">{task.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-600">
            <CheckSquare className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-medium">No tasks found</p>
            <p className="text-xs text-slate-700 mt-1">Add tasks to track your market research and action items.</p>
          </div>
        )}
      </div>

      {/* Quick Access to Competitor Portals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Link
          to="/analysis/zomato"
          className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-rose-200 hover:shadow-sm transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition">Zomato Analysis</h3>
              <p className="text-xs text-slate-700 mt-0.5">{zomatoLikes} positive & {zomatoDislikes} complaint points</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-1 transition" />
        </Link>

        <Link
          to="/analysis/swiggy"
          className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-amber-200 hover:shadow-sm transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition">Swiggy Analysis</h3>
              <p className="text-xs text-slate-700 mt-0.5">{swiggyLikes} positive & {swiggyDislikes} complaint points</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition" />
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;
