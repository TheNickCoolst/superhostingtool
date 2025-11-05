import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check if this is the first user registration
  const { data: setupData } = useQuery({
    queryKey: ['setup'],
    queryFn: () => api.get('/api/auth/setup').then(res => res.data)
  });

  const isFirstUser = setupData?.setupRequired === true;

  const registerMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/auth/register', data),
    onSuccess: (response) => {
      login(response.data.user, response.data.token);
      navigate('/');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ email, username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {isFirstUser && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Initial Setup</p>
                  <p className="text-xs text-blue-700">You will be registered as the administrator</p>
                </div>
              </div>
            </div>
          )}
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isFirstUser ? 'Create Administrator Account' : 'Create your account'}
          </h2>
          {isFirstUser && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Welcome! Set up your admin account to get started
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-minecraft-grass focus:border-minecraft-grass sm:text-sm"
              placeholder="Email address"
            />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-minecraft-grass focus:border-minecraft-grass sm:text-sm"
              placeholder="Username"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-minecraft-grass focus:border-minecraft-grass sm:text-sm"
              placeholder="Password (min. 8 characters)"
              minLength={8}
            />
          </div>

          {registerMutation.isError && (
            <div className="text-red-600 text-sm text-center">
              Registration failed. Please try again.
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-minecraft-grass hover:bg-green-700 focus:outline-none disabled:opacity-50"
            >
              {registerMutation.isPending ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center">
            <Link to="/login" className="text-sm text-minecraft-grass hover:text-green-700">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
