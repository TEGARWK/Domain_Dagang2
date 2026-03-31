import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

// --- 1. COMPONENTS (PUBLIC) ---
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// --- 2. LAYOUTS ---
import DashboardLayout from "./layouts/DashboardLayout";
import { NotificationProvider } from "./context/NotificationContext";
import { ConfirmProvider } from "./context/ConfirmContext";

// --- 3. PAGES: PUBLIC (LANDING & AUTH) ---
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Domain from "./pages/Domain";
import Transfer from "./pages/Transfer";
import Promo from "./pages/Promo";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Vouchers from "./pages/Vouchers";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";

// --- 4. PAGES: DASHBOARD (MEMBER AREA) ---
const Overview = lazy(() => import("./pages/dashboard/Overview")); // Halaman Utama Dashboard
const BuyDomain = lazy(() => import("./pages/dashboard/BuyDomain")); // Halaman Beli Domain Internal
const MyDomains = lazy(() => import("./pages/dashboard/MyDomains")); // Halaman Domain Saya (BARU)
const ManageDomain = lazy(() => import("./pages/dashboard/ManageDomain"));
const Billing = lazy(() => import("./pages/dashboard/Billing"));
const DetailInvoice = lazy(() => import("./pages/dashboard/DetailInvoice"));
const Payment = lazy(() => import("./pages/dashboard/Payment"));
const Wallet = lazy(() => import("./pages/dashboard/Wallet"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));
const Support = lazy(() => import("./pages/dashboard/Support"));
const TransferDomain = lazy(() => import("./pages/dashboard/TransferDomain"));
const Notifications = lazy(() => import("./pages/dashboard/Notifications"));

// --- 4. ADMIN IMPORTS ---
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminInvoices = lazy(() => import("./pages/admin/AdminInvoices"));
const AdminDomains = lazy(() => import("./pages/admin/AdminDomains"));
const AdminPricing = lazy(() => import("./pages/admin/AdminPricing"));
const AdminPromos = lazy(() => import("./pages/admin/AdminPromos"));
const AdminCreateCoupon = lazy(() => import("./pages/admin/AdminCreateCoupon"));
const AdminCreateEvent = lazy(() => import("./pages/admin/AdminCreateEvent"));
const AdminInvoiceDetail = lazy(() => import("./pages/admin/AdminInvoiceDetail"));
const AdminPaymentGateways = lazy(() => import("./pages/admin/AdminPaymentGateways"));
const AdminTransferRequests = lazy(() => import("./pages/admin/AdminTransferRequests"));
const AdminManageDomain = lazy(() => import("./pages/admin/AdminManageDomain"));
const AdminManageUser = lazy(() => import("./pages/admin/AdminManageUser"));
const AdminRegistrarBalance = lazy(() => import("./pages/admin/AdminRegistrarBalance"));
const AdminFAQs = lazy(() => import("./pages/admin/AdminFAQs"));
const AdminSupportTickets = lazy(() => import("./pages/admin/AdminSupportTickets"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AdminAuditLogs"));

// --- 5. ERROR PAGES ---
import Error404 from "./pages/error/Error404";
import Error403 from "./pages/error/Error403";
import Error500 from "./pages/error/Error500";

// --- 5. PLACEHOLDERS (Halaman yang belum dibuat) ---
const PlaceholderPage = ({ title }) => (
  <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
    <h2 className="text-2xl font-bold text-slate-400">{title}</h2>
    <p className="text-sm text-slate-400">
      Halaman ini sedang dalam pengembangan.
    </p>
  </div>
);

// --- MAIN LAYOUT COMPONENT ---
const Layout = () => {
  const location = useLocation();

  // Logic: Sembunyikan Navbar/Footer Public di:
  // 1. Halaman Auth (Login/Register)
  // 2. Halaman Transaksi (Cart/Checkout) -> Supaya fokus & tidak double navbar
  const isAuthPage = [
    "/login",
    "/register",
    "/forgot-password",
    "/cart",
    "/checkout",
  ].includes(location.pathname) || 
  location.pathname.startsWith("/reset-password") || 
  location.pathname.startsWith("/verify");

  // 3. Halaman Dashboard & Admin
  const isDashboardPage = location.pathname.startsWith("/dashboard");
  const isAdminPage = location.pathname.startsWith("/admin");

  // 4. Halaman Payment (Standalone)
  const isPaymentPage = location.pathname.startsWith("/payment");

  // Show Public Header/Footer hanya jika BUKAN Auth/Transaksi, Dashboard, Admin, atau Payment
  const showPublicHeaderFooter = !isAuthPage && !isDashboardPage && !isAdminPage && !isPaymentPage;

  return (
    <div className="font-sans text-slate-900 bg-white selection:bg-[#F97316] selection:text-white flex flex-col min-h-screen">
      {/* NAVBAR PUBLIC */}
      {showPublicHeaderFooter && <Navbar />}

      {/* CONTENT AREA */}
      <main className="flex-grow">
        <NotificationProvider>
          <ConfirmProvider>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-12 h-12 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div></div>}>
              <Routes>

          {/* === A. PUBLIC ROUTES === */}
          <Route path="/" element={<Home />} />
          <Route path="/domain" element={<Domain />} />
          <Route path="/transfer" element={<Transfer />} />
          <Route path="/promo" element={<Promo />} />
          <Route path="/cart" element={<Cart />} />

          {/* === B. AUTH ROUTES === */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="/checkout" element={<Checkout />} />

          {/* === C. DASHBOARD ROUTES (PROTECTED) === */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="vouchers" element={<Vouchers />} />
            <Route path="buy" element={<BuyDomain />} />
            <Route path="transfer" element={<TransferDomain />} />
            <Route path="promo" element={<Promo />} />

            {/* Halaman Domain Saya -> MyDomains.jsx (UPDATE DISINI) */}
            <Route path="domains" element={<MyDomains />} />
            {/* Halaman Manage Domain -> ManageDomain.jsx */}
            <Route path="domains/:id" element={<ManageDomain />} />
            {/* Halaman Wallet -> Wallet.jsx */}
            <Route path="wallet" element={<Wallet />} />
            {/* Halaman Tagihan -> Billing.jsx */}
            <Route path="billing" element={<Billing />} />
            {/* Halaman Detail Invoice -> DetailInvoice.jsx */}
            <Route path="billing/:invoiceId" element={<DetailInvoice />} />
            <Route path="settings" element={<Settings />} />
            <Route path="support" element={<Support />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          {/* === TRANSACTIONS (STANDALONE) === */}
          <Route path="/payment/:invoiceId" element={<Payment />} />

          {/* --- ADMIN ROUTES --- */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminManageUser />} />
            <Route path="invoices" element={<AdminInvoices />} />
            <Route path="invoices/:id" element={<AdminInvoiceDetail />} />
            <Route path="domains" element={<AdminDomains />} />
            <Route path="domains/:id" element={<AdminManageDomain />} />
            <Route path="pricing" element={<AdminPricing />} />
            <Route path="promos" element={<AdminPromos />} />
            <Route path="promos/create-coupon" element={<AdminCreateCoupon />} />
            <Route path="promos/create-event" element={<AdminCreateEvent />} />
            <Route path="payment-gateways" element={<AdminPaymentGateways />} />
            <Route path="transfers" element={<AdminTransferRequests />} />
            <Route path="registrar-balance" element={<AdminRegistrarBalance />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="faqs" element={<AdminFAQs />} />
            <Route path="support-tickets" element={<AdminSupportTickets />} />
            <Route path="logs" element={<AdminAuditLogs />} />
          </Route>


          {/* === D. ERROR ROUTES === */}
          <Route path="/403" element={<Error403 />} />
          <Route path="/500" element={<Error500 />} />
          <Route path="*" element={<Error404 />} />
            </Routes>
              </Suspense>
          </ConfirmProvider>
        </NotificationProvider>
      </main>

      {/* FOOTER PUBLIC */}
      {showPublicHeaderFooter && <Footer />}
    </div>
  );
};

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
