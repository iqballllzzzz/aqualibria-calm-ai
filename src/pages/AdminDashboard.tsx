import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search, LogOut, RefreshCw, Users, Activity, Globe,
  ChevronLeft, ChevronRight, Shield, Clock,
} from "lucide-react";

interface ActivityLog {
  id: string;
  firebase_uid: string;
  user_email: string | null;
  user_display_name: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 25;

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check admin access
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/qwertyuiop/adminpanel/yoyoyo/loginuser");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        await supabase.auth.signOut();
        navigate("/qwertyuiop/adminpanel/yoyoyo/loginuser");
        return;
      }

      setIsAdmin(true);
      setChecking(false);
    };
    checkAdmin();
  }, [navigate]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: (page * ITEMS_PER_PAGE).toString(),
      });
      if (search) params.append("search", search);

      const res = await fetch(
        `${supabaseUrl}/functions/v1/log-activity?${params}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [isAdmin, fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchLogs();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/qwertyuiop/adminpanel/yoyoyo/loginuser");
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes("login")) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (action.includes("chat") || action.includes("message")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (action.includes("image")) return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    if (action.includes("error")) return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return "Unknown";
    if (ua.includes("Mobile")) return "📱 Mobile";
    if (ua.includes("Windows")) return "🖥️ Windows";
    if (ua.includes("Mac")) return "🍎 Mac";
    if (ua.includes("Linux")) return "🐧 Linux";
    return "🌐 Other";
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-green-400 border-green-500/30">
              <Activity className="w-3 h-3 mr-1" />
              {total} total logs
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white">
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold">{new Set(logs.map(l => l.firebase_uid)).size}</p>
                  <p className="text-sm text-gray-400">Unique Users (page)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold">{total}</p>
                  <p className="text-sm text-gray-400">Total Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Globe className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold">{new Set(logs.map(l => l.ip_address).filter(Boolean)).size}</p>
                  <p className="text-sm text-gray-400">Unique IPs (page)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Controls */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by email, name, action, IP..."
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Button type="submit" variant="secondary">
                <Search className="w-4 h-4" />
              </Button>
              <Button type="button" variant="outline" onClick={fetchLogs} className="border-gray-700">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Activity Table */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Activity Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-400">Time</TableHead>
                    <TableHead className="text-gray-400">User</TableHead>
                    <TableHead className="text-gray-400">Action</TableHead>
                    <TableHead className="text-gray-400">IP Address</TableHead>
                    <TableHead className="text-gray-400">Device</TableHead>
                    <TableHead className="text-gray-400">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-gray-800">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-gray-800 rounded animate-pulse w-20" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : logs.length === 0 ? (
                    <TableRow className="border-gray-800">
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No activity logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} className="border-gray-800 hover:bg-gray-800/50">
                        <TableCell className="text-gray-300 text-xs whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-white">
                              {log.user_display_name || "Unknown"}
                            </p>
                            <p className="text-xs text-gray-500">{log.user_email || log.firebase_uid.slice(0, 12)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-400">
                          {log.ip_address || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {parseUserAgent(log.user_agent)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-gray-500">
                          {log.details && Object.keys(log.details).length > 0
                            ? JSON.stringify(log.details).slice(0, 80)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                <p className="text-sm text-gray-500">
                  Page {page + 1} of {totalPages} ({total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="border-gray-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="border-gray-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
