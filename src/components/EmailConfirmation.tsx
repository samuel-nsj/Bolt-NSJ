import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/auth';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function EmailConfirmation() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes('access_token')) {
      setStatus('success');
      setMessage('Your email has been verified! Redirecting to dashboard...');
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } else if (hash.includes('error')) {
      setStatus('error');
      setMessage('Failed to verify your email. The link may be invalid or expired.');
    } else if (user) {
      setStatus('success');
      setMessage('Your email is already verified!');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <div className="flex justify-center">
              <Loader2 className="w-16 h-16 text-purple-600 animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
          )}
          {status === 'error' && (
            <div className="flex justify-center">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {status === 'loading' && 'Verifying Your Email'}
          {status === 'success' && 'Email Verified!'}
          {status === 'error' && 'Verification Failed'}
        </h1>

        <p className="text-gray-600 mb-6">{message}</p>

        {status === 'error' && (
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold"
          >
            Return to Home
          </button>
        )}
      </div>
    </div>
  );
}
