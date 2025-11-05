import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
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
      // Set flag to show onboarding on dashboard
      localStorage.setItem('justRegistered', 'true');
      navigate('/');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Registration failed';
      setValidationErrors({ general: message });
    }
  });

  // Validate password strength
  useEffect(() => {
    if (password.length === 0) {
      setPasswordStrength(null);
      return;
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    const strengthScore = [hasUpper, hasLower, hasNumber, hasSpecial, isLongEnough].filter(Boolean).length;

    if (strengthScore < 3) {
      setPasswordStrength('weak');
    } else if (strengthScore < 5) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
  }, [password]);

  // Validate email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate username
  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(username);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Validate all fields
    const errors: { [key: string]: string } = {};

    if (!validateEmail(email)) {
      errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }

    if (!validateUsername(username)) {
      errors.username = 'Benutzername muss 3-30 Zeichen lang sein und darf nur Buchstaben, Zahlen, _ und - enthalten';
    }

    if (password.length < 8) {
      errors.password = 'Passwort muss mindestens 8 Zeichen lang sein';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password = 'Passwort muss Groß- und Kleinbuchstaben sowie Zahlen enthalten';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

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
          <div className="space-y-4">
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail-Adresse
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setValidationErrors({ ...validationErrors, email: '' });
                }}
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.email ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-minecraft-grass focus:border-minecraft-grass sm:text-sm`}
                placeholder="ihre@email.de"
              />
              {validationErrors.email && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <XCircle className="w-3 h-3 mr-1" />
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Username field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Benutzername
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setValidationErrors({ ...validationErrors, username: '' });
                }}
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.username ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-minecraft-grass focus:border-minecraft-grass sm:text-sm`}
                placeholder="benutzername"
              />
              {validationErrors.username && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <XCircle className="w-3 h-3 mr-1" />
                  {validationErrors.username}
                </p>
              )}
              {username.length > 0 && !validationErrors.username && validateUsername(username) && (
                <p className="mt-1 text-xs text-green-600 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Gültiger Benutzername
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setValidationErrors({ ...validationErrors, password: '' });
                }}
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.password ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-minecraft-grass focus:border-minecraft-grass sm:text-sm`}
                placeholder="Mindestens 8 Zeichen"
                minLength={8}
              />
              {validationErrors.password && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <XCircle className="w-3 h-3 mr-1" />
                  {validationErrors.password}
                </p>
              )}
              {passwordStrength && !validationErrors.password && (
                <div className="mt-2">
                  <div className="flex items-center mb-1">
                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden mr-2">
                      <div
                        className={`h-full transition-all ${
                          passwordStrength === 'weak'
                            ? 'bg-red-500 w-1/3'
                            : passwordStrength === 'medium'
                            ? 'bg-yellow-500 w-2/3'
                            : 'bg-green-500 w-full'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength === 'weak'
                          ? 'text-red-600'
                          : passwordStrength === 'medium'
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}
                    >
                      {passwordStrength === 'weak'
                        ? 'Schwach'
                        : passwordStrength === 'medium'
                        ? 'Mittel'
                        : 'Stark'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Verwenden Sie Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen
                  </p>
                </div>
              )}
            </div>
          </div>

          {validationErrors.general && (
            <div className="rounded-md bg-red-50 p-3 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <strong>Fehler:</strong> {validationErrors.general}
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-minecraft-grass hover:bg-green-700 focus:outline-none disabled:opacity-50 transition-colors"
            >
              {registerMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Account wird erstellt...
                </>
              ) : (
                isFirstUser ? 'Administrator-Konto erstellen' : 'Registrieren'
              )}
            </button>
          </div>

          <div className="text-center">
            <Link to="/login" className="text-sm text-minecraft-grass hover:text-green-700">
              Bereits ein Konto? Hier anmelden
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
