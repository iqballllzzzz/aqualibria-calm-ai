import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Lock, Eye, Database, MessageSquare, Phone } from "lucide-react";
import Logo from "@/components/Logo";

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 sticky top-0 bg-background z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="ml-4 text-lg font-medium text-foreground">Kebijakan Privasi</h1>
      </header>

      <main className="max-w-3xl mx-auto p-6 pb-24">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AquaLibriaAI</h1>
          <p className="text-muted-foreground mt-2">Kebijakan Privasi & Ketentuan Penggunaan</p>
          <p className="text-sm text-muted-foreground mt-1">
            Terakhir diperbarui: Februari 2026
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* Pendahuluan */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Shield className="w-5 h-5 text-purple-500" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">1. Pendahuluan</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              AquaLibriaAI ("kami", "kita", atau "Layanan") berkomitmen untuk melindungi privasi Anda. 
              Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi 
              informasi pribadi Anda saat Anda menggunakan layanan AI kami. Dengan menggunakan AquaLibriaAI, 
              Anda menyetujui praktik yang dijelaskan dalam kebijakan ini.
            </p>
          </motion.section>

          {/* Data yang Dikumpulkan */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Database className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">2. Data yang Kami Kumpulkan</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="font-medium text-foreground mb-2">a. Informasi Akun</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Alamat email untuk otentikasi</li>
                  <li>Nama pengguna (opsional)</li>
                  <li>Preferensi bahasa dan tema</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">b. Data Percakapan</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Pesan chat yang Anda kirim ke AI</li>
                  <li>Gambar yang Anda upload untuk analisis</li>
                  <li>Riwayat percakapan (disimpan lokal di perangkat Anda)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">c. Data Penggunaan</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Jumlah penggunaan fitur untuk limit tracking</li>
                  <li>Preferensi AI dan pengaturan</li>
                  <li>Data transaksi pembayaran (jika upgrade)</li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Penggunaan Data */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Eye className="w-5 h-5 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">3. Penggunaan Data</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Kami menggunakan data yang dikumpulkan untuk:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
              <li>Menyediakan layanan AI yang dipersonalisasi</li>
              <li>Meningkatkan respons dan akurasi AI</li>
              <li>Mengelola akun dan langganan Anda</li>
              <li>Mengirim notifikasi penting terkait layanan</li>
              <li>Mencegah penyalahgunaan dan memastikan keamanan</li>
              <li>Mematuhi persyaratan hukum yang berlaku</li>
            </ul>
          </motion.section>

          {/* Keamanan Data */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Lock className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">4. Keamanan Data</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Kami menerapkan langkah-langkah keamanan yang wajar untuk melindungi data Anda:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Enkripsi data dalam transit menggunakan HTTPS/TLS</li>
                <li>Penyimpanan lokal untuk riwayat chat (tidak dikirim ke server kami)</li>
                <li>Otentikasi aman melalui Firebase Authentication</li>
                <li>Tidak ada penjualan data ke pihak ketiga</li>
              </ul>
              <p className="mt-4">
                <strong className="text-foreground">Catatan Penting:</strong> Riwayat chat Anda disimpan 
                secara lokal di browser Anda. Kami tidak menyimpan percakapan Anda di server kami 
                kecuali diperlukan untuk memproses permintaan AI Anda.
              </p>
            </div>
          </motion.section>

          {/* Hak Pengguna */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <MessageSquare className="w-5 h-5 text-cyan-500" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">5. Hak Anda</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Anda memiliki hak untuk:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
              <li><strong className="text-foreground">Mengakses</strong> data pribadi yang kami simpan tentang Anda</li>
              <li><strong className="text-foreground">Menghapus</strong> riwayat chat dan data lokal kapan saja</li>
              <li><strong className="text-foreground">Mengekspor</strong> riwayat percakapan Anda</li>
              <li><strong className="text-foreground">Memperbarui</strong> preferensi dan pengaturan akun</li>
              <li><strong className="text-foreground">Menolak</strong> penggunaan data untuk tujuan tertentu</li>
              <li><strong className="text-foreground">Menutup</strong> akun Anda dan menghapus semua data terkait</li>
            </ul>
          </motion.section>

          {/* Ketentuan Penggunaan */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Shield className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">6. Ketentuan Penggunaan</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>Dengan menggunakan AquaLibriaAI, Anda setuju untuk:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Tidak menggunakan layanan untuk tujuan ilegal atau berbahaya</li>
                <li>Tidak mencoba merusak, membebani, atau mengganggu layanan</li>
                <li>Tidak mengunggah konten yang melanggar hukum atau hak pihak ketiga</li>
                <li>Bertanggung jawab atas keamanan akun Anda</li>
                <li>Mematuhi batasan penggunaan sesuai paket langganan Anda</li>
              </ul>
              <p className="mt-4">
                Kami berhak untuk menangguhkan atau menghentikan akun yang melanggar ketentuan ini 
                tanpa pemberitahuan sebelumnya.
              </p>
            </div>
          </motion.section>

          {/* Kontak */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Phone className="w-5 h-5 text-purple-500" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">7. Hubungi Kami</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Jika Anda memiliki pertanyaan, keluhan, atau membutuhkan bantuan terkait 
                kebijakan privasi ini atau layanan kami, silakan hubungi:
              </p>
              <div className="bg-background/50 rounded-lg p-4 border border-border">
                <p className="font-medium text-foreground mb-2">Kontak Dukungan:</p>
                <a 
                  href="https://wa.me/6285183317385" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-purple-500 hover:text-purple-400 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="font-medium">+62 85183317385</span>
                </a>
                <p className="text-sm text-muted-foreground mt-2">
                  (WhatsApp tersedia)
                </p>
              </div>
              <p className="text-sm">
                Kami akan merespons pertanyaan Anda dalam waktu 1-3 hari kerja.
              </p>
            </div>
          </motion.section>

          {/* Perubahan Kebijakan */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">8. Perubahan Kebijakan</h2>
            <p className="text-muted-foreground">
              Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan signifikan 
              akan diberitahukan melalui aplikasi atau email. Penggunaan berkelanjutan atas layanan 
              setelah perubahan menunjukkan penerimaan Anda terhadap kebijakan yang diperbarui.
            </p>
          </motion.section>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-center pt-4 pb-8"
          >
            <p className="text-sm text-muted-foreground">
              © 2026 AquaLibriaAI. Dikembangkan oleh M Iqbal.S
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Jakarta, Indonesia
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
