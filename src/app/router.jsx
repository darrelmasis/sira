import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import HistorialPage from "@/pages/HistorialPage";
import MortalidadPage from "@/pages/MortalidadPage";
import ProduccionPage from "@/pages/ProduccionPage";
import AccountPage from "@/pages/AccountPage";
import AppSettingsPage from "@/pages/AppSettingsPage";
import CatalogsPage from "@/pages/CatalogsPage";
import UsersPage from "@/pages/UsersPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ErrorPage from "@/pages/ErrorPage";
import AppShell from "@/components/layout/AppShell";
import { ProtectedRoute, PermissionRoute } from "@/app/guards";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "mortalidad", element: <MortalidadPage /> },
      { path: "produccion", element: <ProduccionPage /> },
      { path: "historial", element: <HistorialPage /> },
      { path: "cuenta", element: <AccountPage /> },
      {
        path: "sistema",
        element: (
          <PermissionRoute permission="settings.view">
            <AppSettingsPage />
          </PermissionRoute>
        ),
      },
      { path: "ajustes", element: <Navigate to="/cuenta" replace /> },
      { path: "sync", element: <Navigate to="/sistema" replace /> },
      {
        path: "usuarios",
        element: (
          <PermissionRoute anyPermission={["users.manage", "roles.manage"]}>
            <UsersPage />
          </PermissionRoute>
        ),
      },
      {
        path: "catalogos",
        element: (
          <PermissionRoute permission="catalogs.manage">
            <CatalogsPage />
          </PermissionRoute>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage />, errorElement: <ErrorPage /> },
]);
