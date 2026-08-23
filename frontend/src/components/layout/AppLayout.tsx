import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import {
  LogOut,
  Menu,
  X,
  Wallet,
  CreditCard,
  Tag,
  PiggyBank,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Footer } from './Footer';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate({ to: '/login' });
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'>
      {/* Navigation */}
      <nav className='bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50'>
        <div className='container mx-auto px-4'>
          <div className='flex justify-between items-center h-14 md:h-16'>
            {/* Logo */}
            <Link
              to='/expenses'
              className='flex items-center gap-2 text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100'
            >
              <Wallet className='w-5 h-5 md:w-6 md:h-6 text-emerald-600 dark:text-emerald-500' />
              <span className='hidden sm:inline'>{t('app.name')}</span>
              <span className='sm:hidden'>{t('app.nameShort')}</span>
            </Link>

            {/* Desktop Menu */}
            <div className='hidden md:flex items-center gap-4'>
              {user && (
                <>
                  <ThemeSwitcher />
                  <LanguageSwitcher />
                  <Link to='/analytics'>
                    <Button variant='ghost' size='sm' className='gap-2'>
                      <BarChart3 className='w-4 h-4' />
                      {t('analytics.title')}
                    </Button>
                  </Link>
                  <Link to='/credit-cards'>
                    <Button variant='ghost' size='sm' className='gap-2'>
                      <CreditCard className='w-4 h-4' />
                      {t('creditCards.title')}
                    </Button>
                  </Link>
                  <Link to='/categories'>
                    <Button variant='ghost' size='sm' className='gap-2'>
                      <Tag className='w-4 h-4' />
                      {t('categories.title')}
                    </Button>
                  </Link>
                  <Link to='/budget'>
                    <Button variant='ghost' size='sm' className='gap-2'>
                      <PiggyBank className='w-4 h-4' />
                      {t('budget.title')}
                    </Button>
                  </Link>
                  <span className='text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full'>
                    {t('auth.hi')} {user.name}
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleLogout}
                    className='gap-2'
                  >
                    <LogOut className='w-4 h-4' />
                    {t('auth.logout')}
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className='md:hidden p-2.5 -mr-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center'
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label='Toggle menu'
            >
              {mobileMenuOpen ? (
                <X className='w-5 h-5' />
              ) : (
                <Menu className='w-5 h-5' />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className='md:hidden py-3 border-t border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 duration-200'>
              {user && (
                <div className='space-y-3'>
                  <div className='px-1'>
                    <ThemeSwitcher />
                  </div>
                  <div className='px-1'>
                    <LanguageSwitcher />
                  </div>
                  <div className='px-1'>
                    <p className='text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1'>
                      {t('auth.signedInAs')}
                    </p>
                    <p className='text-sm font-medium text-slate-800 dark:text-slate-200 truncate'>
                      {user.email}
                    </p>
                  </div>
                  <Link
                    to='/analytics'
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full gap-2 justify-center'
                    >
                      <BarChart3 className='w-4 h-4' />
                      {t('analytics.title')}
                    </Button>
                  </Link>
                  <Link
                    to='/credit-cards'
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full gap-2 justify-center'
                    >
                      <CreditCard className='w-4 h-4' />
                      {t('creditCards.title')}
                    </Button>
                  </Link>
                  <Link
                    to='/categories'
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full gap-2 justify-center'
                    >
                      <Tag className='w-4 h-4' />
                      {t('categories.title')}
                    </Button>
                  </Link>
                  <Link to='/budget' onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full gap-2 justify-center'
                    >
                      <PiggyBank className='w-4 h-4' />
                      {t('budget.title')}
                    </Button>
                  </Link>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleLogout}
                    className='w-full gap-2 justify-center'
                  >
                    <LogOut className='w-4 h-4' />
                    {t('auth.logout')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className='pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8'>
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
