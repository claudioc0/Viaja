'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bus, LayoutDashboard, LogOut, MapPin, Ticket } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { StatusPill, ViajaButton } from '../ui/primitives';

const ADMIN_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/routes', label: 'Gerenciar Rotas', icon: MapPin },
  { href: '/admin/trips', label: 'Gerenciar Viagens', icon: Bus },
  { href: '/admin/reservations', label: 'Consultar Reservas', icon: Ticket },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated, signOut } = useAuth();

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace('/login');
    } else if (user.role !== 'ADMIN') {
      router.replace('/portal');
    }
  }, [isHydrated, user, router]);

  if (!isHydrated || !user || user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Verificando credenciais administrativas...
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 md:grid-cols-[248px_1fr]">
      <aside className="flex flex-col justify-between bg-slate-900 p-5 text-slate-200">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 font-extrabold text-white">
              V
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-white">
                VIAJA Control
              </div>
              <div className="text-xs text-slate-400">Painel Operacional</div>
            </div>
          </div>

          <nav className="space-y-1">
            {ADMIN_LINKS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-slate-800 pt-4">
          <div className="px-2">
            <div className="truncate text-sm font-semibold text-white">{user.name}</div>
            <div className="truncate text-xs text-slate-400">{user.email}</div>
            <div className="mt-2">
              <StatusPill tone="info">ADMIN</StatusPill>
            </div>
          </div>

          <ViajaButton
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={async () => {
              await signOut();
              router.replace('/login');
            }}
          >
            <LogOut className="h-4 w-4" />
            Encerrar sessão
          </ViajaButton>
        </div>
      </aside>

      <main className="p-6 md:p-8">{children}</main>
    </div>
  );
}
