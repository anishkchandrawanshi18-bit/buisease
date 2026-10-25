import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  Sparkles,
  Layers,
} from 'lucide-react';

export const LandingPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="h-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shadow-indigo-200">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">BuisEase</span>
              <p className="text-[11px] text-slate-700 font-medium">Business Operations & Intelligence</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-xs"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-xs"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center flex-1">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Streamlining Business Operations & Market Analytics</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
          BuisEase that makes your <span className="text-indigo-600">business easy</span>.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Centralize your research workflows, track development tasks, and analyze customer sentiment
          from real food-delivery platforms with automated intelligence.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={isAuthenticated ? '/dashboard' : '/register'}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white text-base font-semibold hover:bg-indigo-700 transition shadow-sm hover:shadow-md"
          >
            <span>{isAuthenticated ? 'Open Dashboard' : 'Create Free Account'}</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-base font-semibold hover:bg-slate-50 transition shadow-2xs"
          >
            <span>Sign In to Workspace</span>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Competitor Sentiment Analysis</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Extracted sentiment analysis comparing positive and negative user reviews across Zomato and Swiggy
              to uncover market gaps and product opportunities.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Isolated Task Workspaces</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Structured task tracking with completion progress metrics, instant status transitions,
              and strict data isolation backed by token authorization.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Interactive Visualizations</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Dual visualization engine supporting responsive client-side Chart.js graphics alongside
              server-rendered Matplotlib analytical chart streams.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 text-center text-xs text-slate-700">
        <p>© {new Date().getFullYear()} BuisEase. Streamlining Business Operations & Market Analytics.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
