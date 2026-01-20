import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Crown, Star, Loader2, ExternalLink, Copy, RefreshCw, AlertCircle } from "lucide-react";
import { SUBSCRIPTION_PLANS, PlanType, createPaymentTransaction, checkPaymentStatus, getPaymentUrl } from "@/lib/api";
import { getSubscription, upgradePlan } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes countdown
  const [error, setError] = useState<string | null>(null);
  const currentPlan = getSubscription().plan;

  const planIcons: Record<PlanType, React.ReactNode> = {
    junior: <Star className="w-6 h-6" />,
    senior: <Sparkles className="w-6 h-6" />,
    superior: <Crown className="w-6 h-6" />,
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPaymentData(null);
      setSelectedPlan(null);
      setCountdown(300);
      setError(null);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (paymentData && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    
    if (countdown === 0 && paymentData) {
      toast({
        title: "Pembayaran Kadaluarsa",
        description: "Silakan buat transaksi baru",
        variant: "destructive",
      });
      handleCancel();
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentData, countdown, toast]);

  // Check payment status periodically
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (paymentData && selectedPlan) {
      interval = setInterval(async () => {
        setCheckingStatus(true);
        try {
          const result = await checkPaymentStatus(
            paymentData.order_id,
            paymentData.amount
          );
          
          if (result.success && result.transaction?.status === "completed") {
            // Payment successful!
            upgradePlan(selectedPlan, paymentData.order_id);
            toast({
              title: "Upgrade Berhasil! 🎉",
              description: `Selamat! Anda sekarang menjadi member ${selectedPlan.toUpperCase()}.`,
            });
            setPaymentData(null);
            setSelectedPlan(null);
            setCountdown(300);
            onClose();
          }
        } catch (err) {
          console.error("Error checking payment:", err);
        }
        setCheckingStatus(false);
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentData, selectedPlan, toast, onClose]);

  const handleSelectPlan = async (planId: PlanType) => {
    if (planId === currentPlan || planId === "junior") return;
    
    setSelectedPlan(planId);
    setIsProcessing(true);
    setCountdown(300);
    setError(null);
    
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) return;
    
    // Generate order ID
    const orderId = `AQ${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    try {
      // Create payment transaction via Pakasir API
      const result = await createPaymentTransaction(plan.price, orderId);
      setIsProcessing(false);
      
      if (result.success && result.payment) {
        setPaymentData({
          ...result.payment,
          order_id: orderId,
          amount: plan.price,
        });
      } else {
        setError(result.error || "Gagal membuat pembayaran. Silakan coba lagi.");
        setSelectedPlan(null);
      }
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || "Terjadi kesalahan. Silakan coba lagi.");
      setSelectedPlan(null);
    }
  };

  const handleCancel = () => {
    setPaymentData(null);
    setSelectedPlan(null);
    setCountdown(300);
    setError(null);
  };

  const handleRetry = () => {
    if (selectedPlan) {
      handleSelectPlan(selectedPlan);
    }
  };

  const openPaymentPage = () => {
    if (paymentData) {
      window.open(getPaymentUrl(paymentData.amount, paymentData.order_id), "_blank");
    }
  };

  const copyOrderId = () => {
    if (paymentData?.order_id) {
      navigator.clipboard.writeText(paymentData.order_id);
      toast({ title: "Order ID disalin!" });
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 bg-background border-border">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            Upgrade Plan
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6">
            {/* Error State */}
            {error && !paymentData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-2 text-xs text-destructive hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Coba lagi
                  </button>
                </div>
              </motion.div>
            )}

            {/* Payment QR Code View */}
            <AnimatePresence mode="wait">
              {paymentData ? (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="py-4"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Scan QRIS untuk Membayar
                    </h3>
                    <p className="text-muted-foreground text-sm mb-2">
                      Total: <span className="font-bold text-foreground text-xl">
                        Rp {(paymentData.total_payment || paymentData.amount)?.toLocaleString('id-ID')}
                      </span>
                    </p>
                    <p className="text-destructive text-sm font-medium">
                      Kadaluarsa dalam: {formatCountdown(countdown)}
                    </p>
                  </div>

                  {/* QR Code Display */}
                  <div className="flex justify-center mb-6">
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg relative">
                      {paymentData.payment_number ? (
                        <>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentData.payment_number)}`}
                            alt="QRIS Payment"
                            className="w-48 h-48 sm:w-64 sm:h-64"
                          />
                          {checkingStatus && (
                            <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center">
                              <div className="bg-white rounded-full p-3">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
                          <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <p className="text-sm text-muted-foreground">
                        Order ID: <span className="font-mono text-foreground">{paymentData.order_id}</span>
                      </p>
                      <button onClick={copyOrderId} className="p-1 hover:bg-accent rounded">
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Menunggu pembayaran...
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={openPaymentPage}
                        className="px-5 py-2.5 rounded-xl btn-gradient-purple flex items-center justify-center gap-2 font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Buka Halaman Pembayaran
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-5 py-2.5 rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-colors font-medium"
                      >
                        Batal
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-4">
                      Pembayaran akan otomatis terdeteksi. Jangan tutup halaman ini.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="plans"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Plan Cards */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {SUBSCRIPTION_PLANS.map((plan, index) => {
                      const isCurrentPlan = plan.id === currentPlan;
                      const isPremium = plan.id === "superior";
                      
                      return (
                        <motion.div
                          key={plan.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`relative rounded-2xl border-2 p-5 transition-all ${
                            isPremium
                              ? "border-purple-500 bg-gradient-to-b from-purple-500/10 to-transparent"
                              : isCurrentPlan
                              ? "border-foreground/50 bg-accent"
                              : "border-border hover:border-foreground/30"
                          }`}
                        >
                          {isPremium && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 text-white text-xs font-medium whitespace-nowrap">
                              RECOMMENDED
                            </div>
                          )}
                          
                          {isCurrentPlan && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-foreground text-background text-xs font-medium whitespace-nowrap">
                              CURRENT PLAN
                            </div>
                          )}

                          <div className="text-center mb-5">
                            <div className={`inline-flex p-3 rounded-xl mb-3 ${
                              isPremium ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white" :
                              plan.id === "senior" ? "bg-gradient-to-r from-purple-500 to-purple-700 text-white" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {planIcons[plan.id]}
                            </div>
                            <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                            <div className="mt-2">
                              <span className="text-2xl sm:text-3xl font-bold text-foreground">{plan.priceDisplay}</span>
                              {plan.price > 0 && (
                                <span className="text-muted-foreground text-sm">/lifetime</span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2.5 mb-5">
                            {plan.features.map((feature, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                <span className="text-sm text-muted-foreground">{feature}</span>
                              </div>
                            ))}
                          </div>

                          <div className="text-center text-sm text-muted-foreground mb-4">
                            Model: <span className="font-medium text-foreground">{plan.modelDisplay}</span>
                          </div>

                          <button
                            onClick={() => handleSelectPlan(plan.id)}
                            disabled={isCurrentPlan || plan.id === "junior" || isProcessing}
                            className={`w-full py-2.5 rounded-xl font-medium transition-all ${
                              isCurrentPlan
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : plan.id === "junior"
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : isPremium
                                ? "btn-gradient-purple"
                                : "bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:from-purple-600 hover:to-purple-800"
                            }`}
                          >
                            {isProcessing && selectedPlan === plan.id ? (
                              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            ) : isCurrentPlan ? (
                              "Current Plan"
                            ) : plan.id === "junior" ? (
                              "Free Plan"
                            ) : (
                              `Upgrade ke ${plan.name}`
                            )}
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>

                  <p className="text-center text-xs text-muted-foreground mt-6">
                    Pembayaran diproses melalui QRIS • Aktif selamanya setelah pembayaran
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePlanModal;
