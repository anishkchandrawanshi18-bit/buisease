import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../api/client';
import {
  User,
  Mail,
  CheckSquare,
  ShieldCheck,
  Settings,
  KeyRound,
  AlertCircle,
  Loader2,
  Calendar
} from 'lucide-react';

export const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.getMe();
        setProfile(res.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          User Profile
        </h1>
        <p className="text-sm text-slate-700 mt-1">
          Review your account identity, role credentials, and active workspace metrics.
        </p>
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
          <p className="text-sm">Retrieving profile credentials...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-8">
          {/* Header Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-slate-100">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white font-extrabold text-3xl flex items-center justify-center uppercase shadow-sm shadow-indigo-200">
              {profile?.username?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900">{profile?.username || user?.username}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Authenticated</span>
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1">{profile?.email || user?.email}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-700 tracking-wider">Account Username</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{profile?.username || user?.username}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-700 tracking-wider">Email Address</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{profile?.email || user?.email}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-indigo-600">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-700 tracking-wider">Workspace Tasks</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{profile?.tasks_count || 0} Total Items</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-700 tracking-wider">Password Storage</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">Bcrypt Salted Hash</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-xs"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Update Username</span>
            </Link>
            <Link
              to="/change-password"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
