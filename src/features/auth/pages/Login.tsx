import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LoginCredentials } from '../types/auth.types';
import { login } from '../services/auth.service';
import { LanguageSwitcher } from '../../../components/LanguageSwitcher';
import { TextInput } from '../../../components/ui/TextInput';
import { Button } from '../../../components/ui/Button';
import { UserIcon } from '../../../components/icons/UserIcon';
import { LockIcon } from '../../../components/icons/LockIcon';
import { EyeIcon, EyeOffIcon } from '../../../components/icons/EyeIcon';
import { getStoredAuth } from '../../../utils/authStorage';

interface LoginErrors {
  identifier?: string;
  password?: string;
}

export const LoginPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const [credentials, setCredentials] = useState<LoginCredentials>({
    identifier: '',
    password: '',
  });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { token } = getStoredAuth();
    if (token) {
      navigate('/sequence', { replace: true });
    }
  }, [navigate]);

  const handleChange =
    (field: keyof LoginCredentials) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials((prev) => ({ ...prev, [field]: event.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const validate = (): boolean => {
    const newErrors: LoginErrors = {};
    if (!credentials.identifier.trim()) {
      newErrors.identifier = t('requiredIdentifier');
    }
    if (!credentials.password.trim()) {
      newErrors.password = t('requiredPassword');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setApiError(null);
      await login(credentials);
      navigate('/sequence', { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Une erreur s'est produite lors de la connexion.";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed right-4 top-4 z-20">
        <LanguageSwitcher className="rounded-full bg-white/90 px-3 py-1 text-[0.8rem] font-semibold text-primary shadow-[0_6px_18px_rgba(0,0,0,0.16)] backdrop-blur-sm" />
      </div>

      <main className="w-full max-w-[420px]">
        <section className="mb-4 flex justify-center">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[32px] border-2 border-primary bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <img
              src="/qualisole_logo.png"
              alt="QualiSol logo"
              className="max-h-[72%] max-w-[72%] object-contain"
            />
          </div>
        </section>

        <form
          className="flex flex-col gap-4 rounded-[32px] bg-white px-6 py-7 shadow-[0_18px_40px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.04)] sm:px-8 sm:py-8"
          onSubmit={handleSubmit}
          noValidate
        >
        <div className="mt-1 flex flex-col gap-4">
          <TextInput
            name="identifier"
            label={t('identifierLabel')}
            placeholder={t('identifierPlaceholder')}
            value={credentials.identifier}
            onChange={handleChange('identifier')}
            leftIcon={<UserIcon />}
            error={errors.identifier}
          />

          <div>
            <TextInput
              name="password"
              label={t('passwordLabel')}
              placeholder={t('passwordPlaceholder')}
              type={isPasswordVisible ? 'text' : 'password'}
              value={credentials.password}
              onChange={handleChange('password')}
              leftIcon={<LockIcon />}
              rightIcon={isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
              onRightIconClick={() => setIsPasswordVisible((prev) => !prev)}
              error={errors.password}
            />
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                className="rounded-full border border-primary bg-tertiary px-3 py-1 text-[0.8rem] text-primary"
                onClick={() => {
                  // TODO: hook up to "forgot password" flow / route
                  // eslint-disable-next-line no-console
                  console.log('Forgot password clicked');
                }}
              >
                {t('forgotPassword')}
              </button>
            </div>
          </div>
        </div>

          <div className="mt-1">
            <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
              {t('submit')}
            </Button>
          </div>

          {apiError ? (
            <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">
              {apiError}
            </div>
          ) : null}

          <footer className="mt-3 text-center text-[0.75rem] text-gray-400">
            <div className="mb-1">
              <span className="font-semibold text-secondary">{t('appName')}</span> ©2026. {t('footerText')}
            </div>
            <div className="font-semibold text-primary">{t('footerUrl')}</div>
          </footer>
        </form>
      </main>
    </>
  );
};

