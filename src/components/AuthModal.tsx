import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signup' | 'login';
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const { signUp, signIn } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setIsSignUp(defaultMode === 'signup');
      setError('');
      setMessage('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, defaultMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setIsSignUp(false);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        }, 1500);
      } else {
        await signIn(email, password);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setEmail('');
          setPassword('');
        }, 1000);
      }
    } catch (err: any) {
      console.error('Auth error details:', err);
      const errorMessage = err?.message || '';

      if (errorMessage.includes('User already registered') || errorMessage.includes('already registered')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (errorMessage.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (errorMessage.includes('Email rate limit exceeded')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError(isSignUp
          ? `Unable to create account. ${errorMessage || 'Please try again or contact support.'}`
          : 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="bg-white rounded-2xl max-w-md w-full animate-scale-in shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-lg text-sm">
              {message}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {isSignUp ? 'Account created!' : 'Signed in successfully!'} Redirecting...
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2 rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="px-8 pb-8 text-center text-sm text-gray-600">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-purple-600 hover:text-purple-700 font-semibold"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
