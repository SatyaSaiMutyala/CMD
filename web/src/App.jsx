import { Navigate, Outlet, Route, Routes } from 'react-router'
import { RequireAuth } from './auth/RequireAuth.jsx'
import { AppShell } from './components/AppShell.jsx'
import ArrivalSnackbar from './components/ArrivalSnackbar.jsx'
import ConfirmSheet from './components/ConfirmSheet.jsx'
import DetailsDialog from './components/DetailsDialog.jsx'
import Reminder from './components/Reminder.jsx'
import { PATHS } from './lib/paths.js'
import { AlertsPage } from './pages/AlertsPage.jsx'
import { HistoryPage } from './pages/HistoryPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { OverviewPage } from './pages/OverviewPage.jsx'
import { SoftwarePage } from './pages/SoftwarePage.jsx'
import { HubProvider } from './state/HubProvider.jsx'

/* Everything behind sign-in: the hub's state, the app frame and its overlays. */
function SignedIn() {
  return (
    <RequireAuth>
      <HubProvider>
        <Outlet />
        <DetailsDialog />
        <ConfirmSheet />
        <ArrivalSnackbar />
        <Reminder />
      </HubProvider>
    </RequireAuth>
  )
}

function App() {
  return (
    <Routes>
      <Route path={PATHS.login} element={<LoginPage />} />
      <Route element={<SignedIn />}>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="software/:id" element={<SoftwarePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="alerts" element={<AlertsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={PATHS.overview} replace />} />
    </Routes>
  )
}

export default App
