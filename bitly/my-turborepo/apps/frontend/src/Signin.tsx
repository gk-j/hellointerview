import { useRef, useState } from "react";
import { z, ZodError } from "zod";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "./config";

export const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Signin() {
  const navigate = useNavigate();

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [zodError, setZodError] = useState<ZodError | null>(null);
  const [serverError, setServerError] = useState<string>("");

  async function handleSignin() {
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
        `${BACKEND_URL}/signin`,
        {
          email,
          password,
        },
        {
          withCredentials: true,
        }
      );
      console.log(response.data)
      if (response.data.token) {
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
      <h1>Signin</h1>
      <div>
      <input type="text" placeholder="email" ref={emailRef} />
      <input type="password" placeholder="password" ref={passwordRef} />

      <button onClick={handleSignin}>submit</button>

      {zodError && (
        <div>
          {zodError.issues.map((issue, index) => (
            <p key={index}>{issue.message}</p>
          ))}
        </div>
      )}
      
      {serverError && <p>{serverError}</p>}
      </div>
    </div>
  );
}