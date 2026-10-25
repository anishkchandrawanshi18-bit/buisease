import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const isCompleted = String(status).toLowerCase() === 'completed';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide transition-colors ${
        isCompleted
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-amber-50 text-amber-700 border border-amber-200'
      }`}
    >
      {isCompleted ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-amber-600" />
      )}
      {isCompleted ? 'Completed' : 'Pending'}
    </span>
  );
};

export default StatusBadge;
