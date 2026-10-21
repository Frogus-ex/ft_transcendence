import { createBrowserRouter } from "react-router";
import MainLayout from "../layouts/MainLayout";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import MarketsPage from "../pages/MarketsPage";
import ContactsPage from "../pages/ContactsPage";
import FriendProfilePage from "../pages/FriendProfilePage";
import ProfilePage from "../pages/ProfilePage";
import NewUserPage from "../pages/NewUserPage";
import GdprPage from "../pages/GdprPage";
import PrivateRoute from "../components/PrivateRoute";
import PrivacyPage from "../pages/PrivacyPage";
import TermsPage from "../pages/TermsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "profile", element: <ProfilePage /> },
      {
        path: "contacts",
        element: (
          <PrivateRoute>
            <ContactsPage />
          </PrivateRoute>
        ),
      },
      {
        path: "contacts/:friendId",
        element: (
          <PrivateRoute>
            <FriendProfilePage />
          </PrivateRoute>
        ),
      },
      { path: "markets", element: <MarketsPage /> },
	  { path: "privacy", element: <PrivacyPage /> },
      { path: "terms", element: <TermsPage /> },
      { path: "gdpr", element: <GdprPage /> },
	  { path: "create_user", element: <NewUserPage /> },
    ],
  },
]);

export default router;