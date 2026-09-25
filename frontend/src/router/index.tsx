import { createBrowserRouter } from "react-router";
import MainLayout from "../layouts/MainLayout";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import MarketsPage from "../pages/MarketsPage";
import ContactsPage from "../pages/ContactsPage";
import ProfilePage from "../pages/ProfilePage";
import NewUserPage from "../pages/NewUserPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "contacts", element: <ContactsPage /> },
      { path: "markets", element: <MarketsPage /> },
	  { path: "create_user", element: <NewUserPage /> },
    ],
  },
]);

export default router;
