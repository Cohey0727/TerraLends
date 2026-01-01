import { useCallback } from "react";
import { useRouter } from "./utils/router";
import { HomePage } from "./pages/HomePage";
import { PlanPage } from "./pages/PlanPage";
import "./App.css";

function App() {
  const { route, navigate } = useRouter();

  const handleNavigateToPlan = useCallback(
    (id: string) => {
      navigate({ page: "plan", id });
    },
    [navigate]
  );

  const handleNavigateToHome = useCallback(() => {
    navigate({ page: "home" });
  }, [navigate]);

  if (route.page === "plan") {
    return <PlanPage key={route.id} id={route.id} onBack={handleNavigateToHome} />;
  }

  return <HomePage onNavigate={handleNavigateToPlan} />;
}

export default App;
