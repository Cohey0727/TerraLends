import { useState, useEffect, useCallback } from 'react';

export type Route =
  | { page: 'home' }
  | { page: 'state'; id: string };

function parsePath(): Route {
  const path = window.location.pathname;

  // /states/{id}
  const stateMatch = path.match(/^\/states\/([^/]+)$/);
  if (stateMatch) {
    return { page: 'state', id: stateMatch[1] };
  }

  return { page: 'home' };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parsePath);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parsePath());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((newRoute: Route) => {
    let path: string;
    if (newRoute.page === 'home') {
      path = '/';
    } else {
      path = `/states/${newRoute.id}`;
    }
    window.history.pushState(null, '', path);
    setRoute(newRoute);
  }, []);

  return { route, navigate };
}
