import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "../src/config";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await axios.get(`${BACKEND_URL}/me`, {
          withCredentials: true,
        });
        console.log(response.data.success)
        if (response.data.success) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch {
        setIsLoggedIn(false);
      }
    }

    checkAuth();
  }, []);

  if (isLoggedIn === null) {
    return <p>Loading...</p>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}