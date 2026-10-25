import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import {
  TrendingUp,
  Flame,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3
} from 'lucide-react';

export const FoodDeliveryAnalysisPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [chartKey, setChartKey] = useState(Date.now());

  const fetchInsights = async () => {
    setError('');
    try {
      const res = await api.getFoodDeliveryInsights();
      setData(res.data);
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

  const competitors = data?.competitors || {};
  const zomato = competitors.Zomato || {};
  const swiggy = competitors.Swiggy || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Market Category: Food Delivery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Food Delivery Market Insights
          </h1>
          <p className="text-sm text-slate-700 mt-1">
            Aggregated customer sentiment, feature strengths, and product gaps for major food delivery competitors.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh Insights</span>
          </button>
          <Link
            to="/analysis/comparison"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-xs"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Compare Side-by-Side</span>
          </Link>
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
          <p className="text-sm">Synthesizing competitor insights...</p>
        </div>
      ) : (
        <>
          {/* Competitor Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Zomato Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between hover:border-rose-200 transition">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center font-bold">
                      <Flame className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Zomato</h2>
                      <span className="text-xs font-medium text-slate-700">Food Delivery & Dining</span>
                    </div>
                  </div>
                  <Link
                    to="/analysis/zomato"
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <span>Full Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-800 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Top Likes (Good Features)</span>
                    </div>
                    <span className="font-bold text-emerald-900">{zomato.good_features?.length || 0}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-rose-50/60 border border-rose-100">
                    <div className="flex items-center gap-2 text-rose-800 font-medium">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Complaints (Bad Features)</span>
                    </div>
                    <span className="font-bold text-rose-900">{zomato.bad_features?.length || 0}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      <HelpCircle className="w-4 h-4 text-slate-500" />
                      <span>Missing Product Opportunities</span>
                    </div>
                    <span className="font-bold text-slate-900">{zomato.unavailable_features?.length || 0}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/analysis/zomato"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition"
                >
                  <span>Explore Zomato Reviews & Gaps</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Swiggy Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between hover:border-amber-200 transition">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-bold">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Swiggy</h2>
                      <span className="text-xs font-medium text-slate-700">Food Delivery & Instamart</span>
                    </div>
                  </div>
                  <Link
                    to="/analysis/swiggy"
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    <span>Full Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-800 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Top Likes (Good Features)</span>
                    </div>
                    <span className="font-bold text-emerald-900">{swiggy.good_features?.length || 0}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
                    <div className="flex items-center gap-2 text-amber-800 font-medium">
                      <XCircle className="w-4 h-4 text-amber-600" />
                      <span>Complaints (Bad Features)</span>
                    </div>
                    <span className="font-bold text-amber-900">{swiggy.bad_features?.length || 0}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      <HelpCircle className="w-4 h-4 text-slate-500" />
                      <span>Missing Product Opportunities</span>
                    </div>
                    <span className="font-bold text-slate-900">{swiggy.unavailable_features?.length || 0}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/analysis/swiggy"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition"
                >
                  <span>Explore Swiggy Reviews & Gaps</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Combined Server-Rendered Matplotlib Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Backend Visualizer: Combined Competitor Sentiment
                </h2>
                <p className="text-xs text-slate-700 mt-0.5">
                  Real-time server-rendered Matplotlib graphic generated by FastAPI backend engine
                </p>
              </div>
              <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                GET /competitor-analysis/food-delivery/charts
              </span>
            </div>

            <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 flex items-center justify-center overflow-x-auto">
              <img
                src={api.getFoodDeliveryChartUrl()}
                key={chartKey}
                alt="Combined Food Delivery Chart"
                className="max-h-[380px] w-auto rounded-lg shadow-2xs"
                loading="lazy"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FoodDeliveryAnalysisPage;
