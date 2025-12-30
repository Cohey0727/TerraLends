import { useState, useEffect, useCallback } from 'react';

export type Route =
  | { page: 'home' }
  | { page: 'state'; id: string };

function parseHash(): Route {
  const hash = window.location.hash.slice(1); // remove #

  // /states/{id}
  const stateMatch = hash.match(/^\/states\/([^/]+)$/);
  if (stateMatch) {
    return { page: 'state', id: stateMatch[1] };
  }

  return { page: 'home' };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((newRoute: Route) => {
    if (newRoute.page === 'home') {
      window.location.hash = '/';
    } else if (newRoute.page === 'state') {
      window.location.hash = `/states/${newRoute.id}`;
    }
  }, []);

  return { route, navigate };
}
