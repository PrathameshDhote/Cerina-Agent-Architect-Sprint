import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardLayout } from './components/dashboard/DashboardLayout';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardLayout />
    </QueryClientProvider>
  );
}

export default App;
