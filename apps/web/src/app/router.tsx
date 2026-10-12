import { createBrowserRouter } from "react-router";
import { HomePage } from "./HomePage";
import { LanguageLayout, RootRedirect } from "./LanguageLayout";

export const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },
  {
    path: "/:lang",
    element: <LanguageLayout />,
    children: [{ index: true, element: <HomePage /> }],
  },
]);
