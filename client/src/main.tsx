import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { App } from "./ui/App.js";
import { AdminPage } from "./ui/pages/AdminPage.js";
import { CommunityDetailPage, CommunityPage } from "./ui/pages/CommunityPage.js";
import { ContactsPage } from "./ui/pages/ContactsPage.js";
import { HomePage } from "./ui/pages/HomePage.js";
import { AcceptInvitePage, LoginPage, SignupPage, VerifyEmailPage } from "./ui/pages/LoginPage.js";
import { PetitionsPage } from "./ui/pages/PetitionsPage.js";
import { ResourcesPage } from "./ui/pages/ResourcesPage.js";
import { UpdateDetailPage, UpdatesPage } from "./ui/pages/UpdatesPage.js";
import { WriteUsPage } from "./ui/pages/WriteUsPage.js";
import "./styles.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "updates", element: <UpdatesPage /> },
      { path: "updates/:slug", element: <UpdateDetailPage /> },
      { path: "petitions", element: <PetitionsPage /> },
      { path: "contacts", element: <ContactsPage /> },
      { path: "community", element: <CommunityPage /> },
      { path: "community/:slug", element: <CommunityDetailPage /> },
      { path: "resources", element: <ResourcesPage /> },
      { path: "write-us", element: <WriteUsPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "verify-email", element: <VerifyEmailPage /> },
      { path: "invite/accept", element: <AcceptInvitePage /> },
      { path: "admin", element: <AdminPage /> }
    ]
  }
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
