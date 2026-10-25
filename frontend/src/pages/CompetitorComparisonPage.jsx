import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import {
  Scale,
  Flame,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowLeft
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

export const CompetitorComparisonPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [comparisonTab, setComparisonTab] = useState('likes');
  const [chartKey, setChartKey] = useState(Date.now());

  const fetchInsights = async () => {
    setError('');
    try {
      const res = await api.getFoodDeliveryInsights();
      setData(res.data.competitors || {});
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setChartKey(Date.now());
    fetchInsights();
  };

  const zomato = data?.Zomato || {};
  const swiggy = data?.Swiggy || {};

  const zLikes = zomato.good_features || [];
  const zComplaints = zomato.bad_features || [];
  const zGaps = zomato.unavailable_features || [];

  const sLikes = swiggy.good_features || [];
  const sComplaints = swiggy.bad_features || [];
  const sGaps = swiggy.unavailable_features || [];

  const comparisonChartData = {
    labels: ['Positive Feedback (Likes)', 'Frequent Complaints', 'Identified Gaps'],
    datasets: [
      {
        label: 'Zomato',
        data: [zLikes.length, zComplaints.length, zGaps.length],
        backgroundColor: '#ef4444',
        borderRadius: 6,
      },
      {
        label: 'Swiggy',
        data: [sLikes.length, sComplaints.length, sGaps.length],
        backgroundColor: '#f97316',
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Zomato vs Swiggy Comparison Deep Dive
              </h1>
              <p className="text-xs text-slate-700 mt-0.5">
                Head-to-head evaluation of customer sentiment, service bottlenecks, and missing capabilities.
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
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
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
          <p className="text-sm">Generating competitor comparison matrix...</p>
        </div>
      ) : (
        <>
          {/* Comparative Chart.js Visualizer */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">Side-by-Side Volume Comparison</h2>
            <p className="text-xs text-slate-700 mt-0.5">
              Extracted review points across positive, negative, and missing feature buckets
            </p>

            <div className="h-64 mt-4">
              <Bar
                data={comparisonChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                  },
                  scales: {
                    y: { beginAtZero: true, grid: { color: '#f8fafc' } },
                    x: { grid: { display: false } },
                  },
                }}
              />
            </div>
          </div>

          {/* Tabbed Side-by-Side Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="border-b border-slate-200/80 px-6 pt-4 flex gap-4 overflow-x-auto">
              <button
                onClick={() => setComparisonTab('likes')}
                className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
                  comparisonTab === 'likes'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-700 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Side-by-Side Praises</span>
              </button>

              <button
                onClick={() => setComparisonTab('complaints')}
                className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
                  comparisonTab === 'complaints'
                    ? 'border-rose-600 text-rose-700'
                    : 'border-transparent text-slate-700 hover:text-slate-900'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Side-by-Side Complaints</span>
              </button>

              <button
                onClick={() => setComparisonTab('gaps')}
                className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
                  comparisonTab === 'gaps'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-700 hover:text-slate-900'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>Market Opportunity Gaps</span>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Zomato Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-rose-100 text-rose-600 font-bold text-sm">
                    <Flame className="w-4 h-4" />
                    <span>Zomato</span>
                  </div>

                  {comparisonTab === 'likes' && (
                    <div className="space-y-2.5">
                      {zLikes.map((review, idx) => (
                        <div key={idx} className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl text-xs text-slate-800 leading-relaxed italic">
                          "{review}"
                        </div>
                      ))}
                    </div>
                  )}

                  {comparisonTab === 'complaints' && (
                    <div className="space-y-2.5">
                      {zComplaints.map((review, idx) => (
                        <div key={idx} className="p-3 bg-rose-50/40 border border-rose-100 rounded-xl text-xs text-slate-800 leading-relaxed italic">
                          "{review}"
                        </div>
                      ))}
                    </div>
                  )}

                  {comparisonTab === 'gaps' && (
                    <div className="space-y-2.5">
                      {zGaps.map((gap, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium">
                          • {gap}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Swiggy Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-amber-100 text-amber-600 font-bold text-sm">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Swiggy</span>
                  </div>

                  {comparisonTab === 'likes' && (
                    <div className="space-y-2.5">
                      {sLikes.map((review, idx) => (
                        <div key={idx} className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl text-xs text-slate-800 leading-relaxed italic">
                          "{review}"
                        </div>
                      ))}
                    </div>
                  )}

                  {comparisonTab === 'complaints' && (
                    <div className="space-y-2.5">
                      {sComplaints.map((review, idx) => (
                        <div key={idx} className="p-3 bg-amber-50/40 border border-amber-100 rounded-xl text-xs text-slate-800 leading-relaxed italic">
                          "{review}"
                        </div>
                      ))}
                    </div>
                  )}

                  {comparisonTab === 'gaps' && (
                    <div className="space-y-2.5">
                      {sGaps.map((gap, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium">
                          • {gap}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CompetitorComparisonPage;
