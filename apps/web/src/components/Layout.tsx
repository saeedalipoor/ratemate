import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, loading, login, logout } = useAuth();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-semibold tracking-tight">
            OpenRate
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" className="hover:text-amber-700">
              Businesses
            </Link>
            {!loading && !user && (
              <button
                type="button"
                onClick={login}
                className="rounded-full bg-stone-900 px-4 py-2 text-white hover:bg-stone-700"
              >
                Sign in with GitHub
              </button>
            )}
            {user && (
              <div className="flex items-center gap-3">
                <img
                  src={user.avatarUrl}
                  alt={user.login}
                  className="h-8 w-8 rounded-full"
                />
                <span className="font-medium">@{user.login}</span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="text-stone-500 hover:text-stone-800"
                >
                  Sign out
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="border-t border-stone-200 bg-white py-6 text-center text-sm text-stone-500">
        Open source reviews powered by GitHub Discussions
      </footer>
    </div>
  );
}
