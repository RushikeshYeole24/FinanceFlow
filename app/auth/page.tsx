/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import { auth, db } from "../users/firebaseConfig";
import { LockIcon, MailIcon, UserIcon } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const FinanceFlowLogo = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            className="w-8 h-8 text-white"
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4Z" />
            <path d="M16 10H20V14H16C14.8954 14 14 13.1046 14 12C14 10.8954 14.8954 10 16 10Z" />
          </svg>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full" />
        </div>
      </div>
      <span className="text-4xl font-bold text-white">
        Finance<span className="text-red-500">Flow</span>
      </span>
    </div>
  );
};

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
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background Gradient Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">
        {/* Logo and Tagline */}
        <div className="mb-8 text-center">
          <FinanceFlowLogo className="mb-4 justify-center" />
          <p className="text-xl text-gray-400 mb-2">Your Personal Finance Assistant</p>
          <div className="text-sm text-gray-500 flex items-center justify-center space-x-2">
            <span className="px-3 py-1 bg-gray-800 rounded-full">Smart Expense Tracking</span>
            <span>•</span>
            <span className="text-red-400">Start Free</span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="w-full max-w-md">
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 space-y-6 border border-gray-700">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">
                {isLogin ? "Welcome Back!" : "Join FinanceFlow"}
              </h2>
              <p className="text-gray-400">
                {isLogin
                  ? "Continue your financial journey"
                  : "Start tracking your expenses smarter"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="relative group">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-red-400" size={20} />
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    className="w-full pl-10 pr-4 py-3 bg-gray-900/50 rounded-xl text-white placeholder-gray-400 
                             focus:ring-2 focus:ring-red-500/50 focus:outline-none transition-all
                             border border-gray-700 focus:border-red-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              )}

              <div className="relative group">
                <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-red-400" size={20} />
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/50 rounded-xl text-white placeholder-gray-400 
                           focus:ring-2 focus:ring-red-500/50 focus:outline-none transition-all
                           border border-gray-700 focus:border-red-500"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="relative group">
                <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-red-400" size={20} />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Password"
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/50 rounded-xl text-white placeholder-gray-400 
                           focus:ring-2 focus:ring-red-500/50 focus:outline-none transition-all
                           border border-gray-700 focus:border-red-500"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-500 to-blue-500 text-white p-3 rounded-xl font-medium
                         hover:from-red-600 hover:to-blue-600 transform hover:scale-[1.02] transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                         shadow-lg shadow-red-500/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  isLogin ? "Sign In" : "Create Account"
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError("");
                    setFormData({ email: "", password: "", name: "" });
                  }}
                  className="text-red-400 hover:text-red-300 text-sm transition-colors"
                >
                  {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 