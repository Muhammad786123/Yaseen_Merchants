import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import CompanyLogo from '../../components/common/CompanyLogo.jsx';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { profile } = useCompanyProfile();

  const legalName = profile?.legalName || 'Shahid Yaseen';
  const tagline = profile?.tagline || 'Cotton Waste Merchant';

  useEffect(() => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim() === 'admin' && password === 'admin123') {
      setError('');
      localStorage.setItem('isLoggedIn', 'true');
      navigate('/dashboard', { replace: true });
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F4F0] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Decorative Shapes */}
      <div className="absolute -top-24 -start-24 w-96 h-96 bg-[#1E3A5F]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -end-24 w-96 h-96 bg-[#C97B2E]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Main Login Card */}
        <Card className="shadow-lg border-[#E0DBD3] p-6 sm:p-8 bg-white/95 backdrop-blur-xs">
          {/* Header & Logo */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-3 p-2 bg-[#FAF9F7] rounded-2xl border border-[#E0DBD3] shadow-xs">
              <CompanyLogo variant="default" size="lg" showTagline={false} />
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1E3A5F] tracking-tight">
              {legalName}
            </h1>
            <p className="text-xs font-semibold text-[#C97B2E] uppercase tracking-wider mt-0.5">
              {tagline}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Enter your credentials to access the portal
            </p>

            {/* Brand Gradient Bar */}
            <div className="h-1 w-24 bg-gradient-to-r from-[#00D084] via-[#00D0B6] to-[#00A3FF] rounded-full mt-4"></div>
          </div>

          {/* Inline Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Input
                  label="Username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(val) => {
                    setUsername(val);
                    if (error) setError('');
                  }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(val) => {
                    setPassword(val);
                    if (error) setError('');
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-7.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 py-2.5 font-bold shadow-md hover:shadow-lg transition-all"
              icon={LogIn}
            >
              Sign In
            </Button>
          </form>


        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-gray-500 mt-6 font-medium">
          {legalName} ERP &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
