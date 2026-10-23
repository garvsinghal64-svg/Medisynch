import React, { useState } from 'react';
import { Lock, Shield, ArrowRight, UserCheck, KeyRound, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types/clinical';

interface AutoLogoutLockModalProps {
  isOpen: boolean;
  user: UserProfile;
  onUnlock: (pin: string) => boolean;
  onSwitchUser: () => void;
}

export const AutoLogoutLockModal: React.FC<AutoLogoutLockModalProps> = ({
  isOpen,
  user,
  onUnlock,
  onSwitchUser,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onUnlock(pin);
    if (!success) {
      setError(true);
      setPin('');
    } else {
      setError(false);
      setPin('');
    }
  };

  const handleQuickUnlock = () => {
    onUnlock(user.pin || '1234');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 border border-amber-200 shadow-xs">
            <Lock className="w-7 h-7 text-amber-900" />
          </div>

          <h3 className="text-lg font-bold text-stone-900">Hospital Workstation Locked</h3>
          <p className="text-xs text-stone-500 mt-1">
            Inactivity security timeout triggered on shared hospital terminal (§164.312 HIPAA Technical Safeguard).
          </p>

          <div className="my-5 p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-sm">
              {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-stone-900 truncate">{user.name}</div>
              <div className="text-[11px] text-stone-500 truncate">{user.title} • {user.department}</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold uppercase">
              {user.role}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block text-left mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-stone-400" />
                Enter 4-Digit Station PIN
              </label>
              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="••••"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setError(false);
                }}
                className={`w-full text-center tracking-[0.5em] text-lg font-mono py-2.5 bg-stone-50 border rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                  error
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/50'
                    : 'border-stone-200 focus:ring-teal-500'
                }`}
              />
              {error && (
                <div className="text-xs text-rose-600 mt-1.5 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Incorrect PIN. (Default demo PIN is {user.pin || '1234'})
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                Unlock Workstation
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleQuickUnlock}
                className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-xl transition-colors whitespace-nowrap"
                title="Quick demo bypass"
              >
                Quick Unlock (Demo)
              </button>
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
            <span>Not {user.name.split(' ')[0]}?</span>
            <button
              onClick={onSwitchUser}
              className="font-semibold text-teal-800 hover:text-teal-950 hover:underline flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Switch Staff Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
