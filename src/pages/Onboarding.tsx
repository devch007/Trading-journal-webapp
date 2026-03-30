import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export function Onboarding() {
  const { completeOnboarding, userProfile } = useAuth();
  const navigate = useNavigate();
  const [experience, setExperience] = useState('Beginner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await completeOnboarding({ experience });
      navigate('/');
    } catch (err: any) {
      console.error('Failed to complete onboarding', err);
      setError(err.message || 'Failed to save profile. Please check your database permissions.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-8 rounded-3xl flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-headline text-on-surface mb-2">Welcome to Edgr!</h1>
        <p className="text-on-surface-variant mb-8">
          Let's get your account set up. What is your current trading experience level?
        </p>

        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Error saving profile</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-3 text-left">
            {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
              <label 
                key={level}
                className={`flex items-center p-4 rounded-xl border cursor-pointer transition-colors ${
                  experience === level 
                    ? 'bg-primary/10 border-primary text-primary' 
                    : 'bg-surface-variant/50 border-outline/20 text-on-surface hover:bg-surface-variant'
                }`}
              >
                <input
                  type="radio"
                  name="experience"
                  value={level}
                  checked={experience === level}
                  onChange={(e) => setExperience(e.target.value)}
                  className="mr-3 accent-primary"
                />
                <span className="font-medium">{level}</span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 mt-6 rounded-xl bg-primary text-on-primary font-medium hover:bg-primary/90 transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
