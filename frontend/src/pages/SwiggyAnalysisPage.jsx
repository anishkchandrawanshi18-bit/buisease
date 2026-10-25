import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import {
  ShoppingBag,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export const SwiggyAnalysisPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('good');
  const [chartKey, setChartKey] = useState(Date.now());

  const fetchAnalysis = async () => {
    setError('');
    try {
      const res = await api.getSwiggyAnalysis();
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setChartKey(Date.now());
    fetchAnalysis();
  };

  const good = data?.good_features || [];
  const bad = data?.bad_features || [];
  const missing = data?.unavailable_features || [];

  const barData = {
    labels: ['Positive Feedback (Likes)', 'Critical Complaints (Dislikes)'],
    datasets: [
      {
        label: 'Extracted Review Count',
        data: [good.length, bad.length],
        backgroundColor: ['#2ecc71', '#FC8019'],
        borderRadius: 8,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div>
        <Link
          to="/analysis/food-delivery"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Market Overview</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Swiggy Sentiment & Feature Breakdown
              </h1>
              <p className="text-xs text-slate-700 mt-0.5">
                Top customer praises, frequent pain points, and product gaps.
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-600 mb-2" />
          <p className="text-sm">Loading Swiggy analysis...</p>
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interactive Chart.js Visualizer */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Interactive Sentiment Breakdown</h2>
                <p className="text-xs text-slate-700 mt-0.5">Ratio of positive features vs negative complaints</p>
              </div>

              <div className="h-60 mt-4 flex items-center justify-center">
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, grid: { color: '#f8fafc' } },
                      x: { grid: { display: false } },
                    },
                  }}
                />
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-around text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <ThumbsUp className="w-3.5 h-3.5" /> {good.length} Praised Points
                </span>
                <span className="flex items-center gap-1.5 text-amber-700">
                  <ThumbsDown className="w-3.5 h-3.5" /> {bad.length} Complaints
                </span>
              </div>
            </div>

            {/* Server-Side Matplotlib Graphic */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">FastAPI Generated Chart</h2>
                  <p className="text-xs text-slate-700 mt-0.5">Streamed from backend Matplotlib buffer</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  GET /swiggy/chart
                </span>
              </div>

              <div className="h-60 mt-4 flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 p-2">
                <img
                  src={api.getSwiggyChartUrl()}
                  key={chartKey}
                  alt="Swiggy Analytics Chart"
                  className="max-h-full w-auto rounded shadow-2xs"
                  loading="lazy"
                />
              </div>

              <p className="mt-3 text-[11px] text-slate-700 text-center">
                Server image generated with non-interactive Agg canvas
              </p>
            </div>
          </div>

          {/* Review Details with Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="border-b border-slate-200/80 px-6 pt-4 flex gap-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('good')}
                className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
                  activeTab === 'good'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-700 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Good Features ({good.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('bad')}
                className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
                  activeTab === 'bad'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-slate-700 hover:text-slate-900'
                }`}
              >
                <XCircle className="w-4 h-4 text-amber-600" />
                <span>Frequent Complaints ({bad.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('missing')}
                className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
                  activeTab === 'missing'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-700 hover:text-slate-900'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>Unavailable Opportunities ({missing.length})</span>
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'good' && (
                <div className="space-y-3">
                  {good.map((review, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-start gap-3"
                    >
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed italic">"{review}"</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'bad' && (
                <div className="space-y-3">
                  {bad.map((review, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-amber-50/40 border border-amber-100 flex items-start gap-3"
                    >
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed italic">"{review}"</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'missing' && (
                <div className="space-y-3">
                  {missing.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3"
                    >
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{item}</p>
                        <p className="text-[11px] text-slate-700 mt-0.5">
                          Identified product gap not currently offered natively by Swiggy.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SwiggyAnalysisPage;
