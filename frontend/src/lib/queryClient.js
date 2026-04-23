// src/lib/queryClient.js
// Shared QueryClient instance — imported by App.jsx and useAuth.jsx
// Extracted to its own module to avoid circular imports.
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
})

export default queryClient
