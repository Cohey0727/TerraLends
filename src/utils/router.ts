import { useState, useEffect, useCallback } from 'react';

export type Route =
  | { page: 'home' }
  | { page: 'plan'; id: string };

function parsePath(): Route {
  const path = window.location.pathname;

  // /plans/{id}
  const planMatch = path.match(/^\/plans\/([^/]+)$/);
  if (planMatch) {
    return { page: 'plan', id: planMatch[1] };
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
      path = `/plans/${newRoute.id}`;
    }
    window.history.pushState(null, '', path);
    setRoute(newRoute);
  }, []);

  return { route, navigate };
}
