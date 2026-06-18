import { useRef, useState } from "react";
import { z, ZodError } from "zod";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "./config";

export const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Signup() {
  const navigate = useNavigate();

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [zodError, setZodError] = useState<ZodError | null>(null);
  const [serverError, setServerError] = useState<string>("");

  async function handleSignup() {
    const email = emailRef.current?.value || "";
    const password = passwordRef.current?.value || "";

    const result = authSchema.safeParse({ email, password });

    if (!result.success) {
      setZodError(result.error);
      setServerError("");
      return;
    }

    setZodError(null);
    setServerError("");

    try {
      const response = await axios.post(
        `${BACKEND_URL}/signup`,
        {
          email,
          password,
        },
        {
          withCredentials: true,
        }
      );
      console.log(response.data)
      if (response.data.success) {
        navigate("/home");
      } else {
        setServerError(response.data.message || "Signin failed");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setServerError(err.response?.data?.message || "Invalid email or password");
      } else {
        setServerError("Something went wrong");
      }
    }
  }

  return (
    <div>
      <h1>Signup</h1>
      <input type="text" placeholder="email" ref={emailRef} />
      <input type="password" placeholder="password" ref={passwordRef} />

      <button onClick={handleSignup}>submit</button>

      {zodError && (
        <div>
          {zodError.issues.map((issue, index) => (
            <p key={index}>{issue.message}</p>
          ))}
        </div>
      )}
      <button onClick={()=>navigate("/signin")}>if logged in please signin</button>
      {serverError && <p>{serverError}</p>}
    </div>
  );
}