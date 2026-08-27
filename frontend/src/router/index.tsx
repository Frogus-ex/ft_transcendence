import { createBrowserRouter } from "react-router";
import MainLayout from "../layouts/MainLayout";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import MarketsPage from "../pages/MarketsPage";
import FriendsPage from "../pages/FriendsPage";
import WalletPage from "../pages/WalletPage";
import ProfilePage from "../pages/ProfilePage";
import DashboardPage from "../pages/DashboardPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "wallet", element: <WalletPage /> },
      { path: "friends", element: <FriendsPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "markets", element: <MarketsPage /> },
    ],
  },
]);

export default router;
