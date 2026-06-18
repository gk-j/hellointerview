import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signin from "./Signin";
import Home from "./Home";
import Signup from "./Signup";
import ProtectedRoute from "../components/ProtectedRoute"
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Signup/>} />
        <Route path="/signin" element={<Signin />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}