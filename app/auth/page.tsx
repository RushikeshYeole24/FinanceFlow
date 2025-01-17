/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import { auth, db } from "../users/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        console.log("Attempting to sign in with:", formData.email);
        const userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        console.log("Sign in successful:", userCredential.user.uid);
        
        // Set auth cookie
        const idToken = await userCredential.user.getIdToken();
        // Store the token in localStorage (temporary solution)
        localStorage.setItem('authToken', idToken);
        
        router.push("/");
      } else {
        // Signup
        console.log("Attempting to create account with:", formData.email);
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        console.log("Account created:", userCredential.user.uid);

        // Update profile with name
        await updateProfile(userCredential.user, {
          displayName: formData.name,
        });

        // Create user document in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
          name: formData.name,
          email: formData.email,
          createdAt: new Date(),
        });

        // Set auth cookie
        const idToken = await userCredential.user.getIdToken();
        localStorage.setItem('authToken', idToken);

        router.push("/");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      setError(
        error.code === "auth/wrong-password"
          ? "Invalid email or password"
          : error.code === "auth/user-not-found"
          ? "No account found with this email"
          : error.code === "auth/email-already-in-use"
          ? "An account already exists with this email"
          : "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="mt-2 text-gray-400">
            {isLogin
              ? "Sign in to access your account"
              : "Sign up to get started"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {!isLogin && (
            <div>
              <label className="text-sm font-medium text-gray-300">Name</label>
              <input
                type="text"
                required
                className="w-full mt-2 p-3 bg-gray-700 rounded-lg text-white"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-300">
              Email address
            </label>
            <input
              type="email"
              required
              className="w-full mt-2 p-3 bg-gray-700 rounded-lg text-white"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full mt-2 p-3 bg-gray-700 rounded-lg text-white"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 text-white p-3 rounded-lg font-medium
                     hover:bg-blue-700 transition-colors
                     ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Processing...' : (isLogin ? "Sign In" : "Sign Up")}
          </button>

          <p className="text-center text-gray-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setFormData({ email: "", password: "", name: "" });
              }}
              className="text-blue-400 hover:text-blue-300"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default AuthPage; 