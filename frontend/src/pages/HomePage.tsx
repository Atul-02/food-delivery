import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '../lib/api';
import { titleCase } from '../lib/format';
import type { Paginated, Restaurant } from '../types';
import { EmptyState, ErrorBox, RestaurantImage, Spinner } from '../components/ui';

const CUISINES = ['north indian', 'south indian', 'chinese', 'mughlai', 'pizza', 'biryani', 'desserts'];

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function HomePage() {
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState<string | null>(null);
  const debouncedSearch = useDebounced(search.trim(), 300);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (cuisine) params.set('cuisine', cuisine);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['restaurants', debouncedSearch, cuisine],
    queryFn: () => api<Paginated<Restaurant>>(`/restaurants?${params}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-500 to-rose-500 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Hungry? Order from the best places near you.</h1>
          <p className="mt-2 text-white/90">Fresh food, delivered fast.</p>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for restaurants or cuisines…"
            className="mt-6 w-full max-w-xl rounded-xl px-4 py-3 text-gray-900 shadow-lg outline-none focus:ring-4 focus:ring-white/40"
          />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap gap-2">
          {CUISINES.map((c) => (
            <button
              key={c}
              onClick={() => setCuisine(cuisine === c ? null : c)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                cuisine === c
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {titleCase(c)}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">
            {data ? `${data.total} restaurant${data.total === 1 ? '' : 's'}` : 'Restaurants'}
          </h2>
          {isFetching && !isLoading && <span className="text-xs text-gray-400">Updating…</span>}
        </div>

        <div className="mt-4">
          {isLoading ? (
            <Spinner />
          ) : error ? (
            <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />
          ) : data && data.items.length === 0 ? (
            <EmptyState icon="🍽️" title="No restaurants found">
              Try a different search or cuisine.
            </EmptyState>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data?.items.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant: r }: { restaurant: Restaurant }) {
  return (
    <Link
      to={`/restaurants/${r.id}`}
      className={`group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md ${
        r.isOpen ? '' : 'opacity-60'
      }`}
    >
      <div className="relative">
        <RestaurantImage name={r.name} imageUrl={r.imageUrl} className="h-40 w-full" />
        {!r.isOpen && (
          <span className="absolute left-3 top-3 rounded-md bg-gray-900/80 px-2 py-1 text-xs font-semibold text-white">
            Closed now
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold group-hover:text-brand-600">{r.name}</h3>
          <Rating value={r.avgRating} count={r.ratingCount} />
        </div>
        <p className="mt-1 truncate text-sm text-gray-500">{r.cuisines.map(titleCase).join(', ')}</p>
        <p className="mt-1 truncate text-xs text-gray-400">
          {r.addressLine}, {r.city}
        </p>
      </div>
    </Link>
  );
}

export function Rating({ value, count }: { value: number; count: number }) {
  if (count === 0) return <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600">New</span>;
  return (
    <span className="shrink-0 rounded-md bg-green-600 px-1.5 py-0.5 text-xs font-semibold text-white">
      ★ {value.toFixed(1)}
    </span>
  );
}
