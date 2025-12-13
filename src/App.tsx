import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/auth';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import BookingModal from './components/BookingModal';
import Dashboard from './components/Dashboard';
import PricingTable from './components/PricingTable';
import TrustLogos from './components/TrustLogos';
import TrackingModal from './components/TrackingModal';
import Chatbot from './components/Chatbot';
import EmailConfirmation from './components/EmailConfirmation';
import QuoteModal from './components/QuoteModal';
import SavedQuotes from './components/SavedQuotes';
import PaymentSuccessModal from './components/PaymentSuccessModal';

function AppContent() {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signup' | 'login'>('login');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [isConfirmationPage, setIsConfirmationPage] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed'>('success');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  useEffect(() => {
    if (window.location.pathname === '/auth/confirm') {
      setIsConfirmationPage(true);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const payment = urlParams.get('payment');

    if (payment === 'success') {
      setShowPaymentSuccess(true);
      setShowDashboard(true);

      const zapierPayload = localStorage.getItem('zapierPayload');
      if (zapierPayload) {
        const data = JSON.parse(zapierPayload);
        fetch('https://hooks.zapier.com/hooks/catch/25155687/ukds2pw/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            payment_status: 'paid',
            payment_completed_at: new Date().toISOString()
          }),
        }).then(() => {
          localStorage.removeItem('zapierPayload');
          console.log('Order sent to Zapier/StarShipIt after payment');
        }).catch((error) => {
          console.error('Error sending to Zapier:', error);
        });
      }

      window.history.replaceState({}, '', window.location.pathname);
    } else if (payment === 'failed' || payment === 'cancelled') {
      setPaymentStatus('failed');
      setShowPaymentModal(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  const handleBookClick = () => {
    if (user) {
      setShowBookingModal(true);
    } else {
      setShowAuthModal(true);
    }
  };

  if (isConfirmationPage) {
    return <EmailConfirmation />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-900">Loading...</p>
        </div>
      </div>
    );
  }

  if (user && showDashboard) {
    return (
      <>
        <Dashboard
          onBookClick={() => setShowBookingModal(true)}
          onBackToHome={() => setShowDashboard(false)}
          onBookWithQuote={(data) => {
            setQuoteData(data);
            setShowBookingModal(true);
          }}
          showPaymentSuccess={showPaymentSuccess}
        />
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setPaymentSessionId(null);
            setQuoteData(null);
          }}
          paymentSessionId={paymentSessionId}
          quoteData={quoteData}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header
        onBookClick={handleBookClick}
        onLoginClick={() => {
          setShowDashboard(true);
          setAuthModalMode('login');
          setShowAuthModal(true);
        }}
        onTrackClick={() => setShowTrackingModal(true)}
      />
      <Hero
        onBookClick={handleBookClick}
        onQuoteClick={() => setShowQuoteModal(true)}
        onSignUpClick={() => {
          setAuthModalMode('signup');
          setShowAuthModal(true);
        }}
      />
      <PricingTable onBookNow={handleBookClick} />
      <TrustLogos />
      <Features />
      <Testimonials />
      <FAQ />
      <Footer />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authModalMode}
      />
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setPaymentSessionId(null);
          setQuoteData(null);
        }}
        paymentSessionId={paymentSessionId}
        quoteData={quoteData}
      />
      <TrackingModal
        isOpen={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
      />
      <QuoteModal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        onGetQuote={() => {
          setShowQuoteModal(false);
          handleBookClick();
        }}
        onBookJob={(data) => {
          console.log('App.tsx - Book Job callback received:', data);
          setQuoteData(data);
          setShowQuoteModal(false);
          setShowBookingModal(true);
          console.log('App.tsx - Modals updated, booking should open');
        }}
      />
      <Chatbot
        onOpenQuote={() => setShowQuoteModal(true)}
        onOpenTracking={() => setShowTrackingModal(true)}
        onOpenBooking={() => {
          if (user) {
            setShowBookingModal(true);
          } else {
            setAuthModalMode('login');
            setShowAuthModal(true);
          }
        }}
        onOpenLogin={() => {
          setAuthModalMode('login');
          setShowAuthModal(true);
        }}
      />
      <PaymentSuccessModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        status={paymentStatus}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
