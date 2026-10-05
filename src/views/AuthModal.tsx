import React, { useState } from 'react';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Mail, Lock, User, Building2, CheckCircle2 } from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { apiService } from '../services/apiService';

export type AuthMode = 'login' | 'signup' | 'forgot_password';

export interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthMode;
  noticeMessage?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  noticeMessage,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const toast = useToast();

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setServerError(null);
      setErrors({});
    }
  }, [isOpen, initialMode]);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid work or organization email';
    }

    if (mode !== 'forgot_password') {
      if (!password) {
        newErrors.password = 'Password is required';
      } else if (password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    }

    if (mode === 'signup') {
      if (!name.trim()) newErrors.name = 'Full name is required';
      if (!orgName.trim()) newErrors.orgName = 'Organization/University name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setIsLoading(true);

    try {
      if (mode === 'forgot_password') {
        setResetSent(true);
        toast.info('Password reset instructions sent', `Check inbox for ${email}`);
        setIsLoading(false);
        return;
      }

      if (mode === 'signup') {
        const res = await apiService.signup({
          name: name.trim(),
          email: email.trim(),
          password,
          orgName: orgName.trim(),
        });
        toast.success('Workspace created successfully', `Welcome to KnowFlow AI, ${res.user.name}!`);
      } else {
        const res = await apiService.login({
          email: email.trim(),
          password,
        });
        toast.success('Signed in successfully', `Logged in as ${res.user.email}`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const titles = {
    login: 'Log in to KnowFlow AI',
    signup: 'Create Organization Account',
    forgot_password: 'Reset Your Password',
  };

  const subtitles = {
    login: 'Access your source-grounded assistant workspaces',
    signup: 'Deploy knowledge assistants with multi-tenant governance',
    forgot_password: 'Enter your email to receive recovery instructions',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titles[mode]}
      description={subtitles[mode]}
      maxWidth="md"
    >
      {resetSent ? (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-slate-900">Check your email</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We sent a secure password recovery link to <strong className="text-slate-800">{email}</strong>.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResetSent(false);
              setMode('login');
            }}
          >
            Back to login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {noticeMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg">
              {noticeMessage}
            </div>
          )}

          {serverError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {serverError}
            </div>
          )}

          {mode === 'signup' && (
            <>
              <Input
                label="Full Name"
                placeholder="e.g. Dr. Arthur Vance"
                icon={User}
                value={name}
                onChange={e => setName(e.target.value)}
                error={errors.name}
              />
              <Input
                label="Organization / University"
                placeholder="e.g. Apex University"
                icon={Building2}
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                error={errors.orgName}
              />
            </>
          )}

          <Input
            label="Work Email"
            type="email"
            placeholder="name@organization.edu"
            icon={Mail}
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={errors.email}
          />

          {mode !== 'forgot_password' && (
            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                value={password}
                onChange={e => setPassword(e.target.value)}
                error={errors.password}
              />
              {mode === 'login' && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setServerError(null);
                      setMode('forgot_password');
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isLoading}
              className="w-full"
            >
              {mode === 'login' && 'Sign In to Workspace'}
              {mode === 'signup' && 'Create Tenant Account'}
              {mode === 'forgot_password' && 'Send Reset Link'}
            </Button>
          </div>

          <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
            {mode === 'login' ? (
              <p>
                Don't have an organization workspace?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrors({});
                    setServerError(null);
                    setMode('signup');
                  }}
                  className="text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrors({});
                    setServerError(null);
                    setMode('login');
                  }}
                  className="text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  Log in
                </button>
              </p>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
};
