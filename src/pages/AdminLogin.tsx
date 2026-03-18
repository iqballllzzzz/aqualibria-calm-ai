import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Eye, EyeOff } from "lucide-react";

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError("Invalid credentials"); setLoading(false); return; }
      if (!data.user) { setError("Login failed"); setLoading(false); return; }
      const { data: roleCheck } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").single();
      if (!roleCheck) { await supabase.auth.signOut(); setError("Access denied. Admin only."); setLoading(false); return; }
      navigate("/admin");
    } catch { setError("Something went wrong"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <Card className="w-full max-w-md bg-gray-900/80 border-gray-700 backdrop-blur-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center"><Lock className="w-6 h-6 text-primary" /></div>
          <CardTitle className="text-xl text-white">System Access</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-gray-800 border-gray-600 text-white" required />
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-gray-800 border-gray-600 text-white pr-10" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Authenticating..." : "Sign In"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
