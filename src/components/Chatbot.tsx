import { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  quickReplies?: string[];
  action?: {
    type: 'open_quote' | 'open_tracking' | 'open_booking' | 'open_login';
    label: string;
  };
}

interface ChatContext {
  lastTopic?: string;
  userIntent?: string;
  conversationHistory: string[];
}

interface ChatbotProps {
  onOpenQuote?: () => void;
  onOpenTracking?: () => void;
  onOpenBooking?: () => void;
  onOpenLogin?: () => void;
}

const GREETINGS = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'howdy', 'sup', 'yo'];
const THANKS = ['thanks', 'thank you', 'thx', 'appreciate', 'cheers'];

export default function Chatbot({ onOpenQuote, onOpenTracking, onOpenBooking, onOpenLogin }: ChatbotProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your NSJ Express AI assistant. I can help you with:\n\n📦 Getting quotes and booking shipments\n📍 Tracking your packages\n💰 Understanding pricing\n⏰ Delivery times and schedules\n\nWhat would you like to do today?',
      sender: 'bot',
      timestamp: new Date(),
      quickReplies: ['Get a quote', 'Track package', 'Book shipment', 'Check pricing'],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<ChatContext>({
    conversationHistory: [],
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzeIntent = (message: string): string => {
    const lower = message.toLowerCase().trim();

    if (GREETINGS.some(g => lower === g || lower.startsWith(g + ' ') || lower.startsWith(g + '!'))) {
      return 'greeting';
    }

    if (THANKS.some(t => lower.includes(t))) {
      return 'thanks';
    }

    if (lower.match(/\b(quote|price|cost|how much|estimate|rate)\b/)) {
      return 'quote';
    }

    if (lower.match(/\b(track|where|status|find|locate|tracking number)\b/)) {
      return 'tracking';
    }

    if (lower.match(/\b(book|booking|ship|send|create|place order|new shipment|schedule)\b/)) {
      return 'booking';
    }

    if (lower.match(/\b(delivery time|how long|when|eta|transit time|days)\b/)) {
      return 'delivery_time';
    }

    if (lower.match(/\b(weight|size|dimension|limit|maximum|heavy)\b/)) {
      return 'weight';
    }

    if (lower.match(/\b(payment|pay|credit card|invoice|billing)\b/)) {
      return 'payment';
    }

    if (lower.match(/\b(cancel|refund|modify|change|edit)\b/)) {
      return 'cancel';
    }

    if (lower.match(/\b(insurance|cover|protect|loss|damage)\b/)) {
      return 'insurance';
    }

    if (lower.match(/\b(location|area|city|where|deliver to|service)\b/)) {
      return 'locations';
    }

    if (lower.match(/\b(hour|time|open|close|available|contact|support|help)\b/)) {
      return 'support';
    }

    if (lower.match(/\b(account|sign up|register|login|profile|dashboard)\b/)) {
      return 'account';
    }

    return 'general';
  };

  const getBotResponse = (userMessage: string): Message => {
    const intent = analyzeIntent(userMessage);
    const lower = userMessage.toLowerCase();

    let response: Partial<Message> = {
      id: (Date.now() + 1).toString(),
      sender: 'bot',
      timestamp: new Date(),
    };

    switch (intent) {
      case 'greeting':
        const greeting = user
          ? `Hi ${user.email?.split('@')[0]}! 👋`
          : 'Hi there! 👋';
        response.text = `${greeting} I'm here to help! What would you like to do today?`;
        response.quickReplies = ['Get a quote', 'Track package', 'Book shipment', 'Check pricing'];
        break;

      case 'thanks':
        response.text = 'You\'re very welcome! 😊 Is there anything else I can help you with?';
        response.quickReplies = ['Get a quote', 'Track package', 'Book shipment'];
        break;

      case 'quote':
        response.text = 'I can help you get an instant quote! Just click the button below and I\'ll open the quote calculator for you. You can enter your pickup location, delivery location, and package details to see the estimated price.';
        response.action = {
          type: 'open_quote',
          label: '📊 Open Quote Calculator'
        };
        response.quickReplies = ['Book shipment', 'Check delivery times', 'Track package'];
        setContext(prev => ({ ...prev, lastTopic: 'quote' }));
        break;

      case 'tracking':
        response.text = 'I can help you track your package! Click the button below to open the tracking tool where you can enter your tracking number.';
        response.action = {
          type: 'open_tracking',
          label: '📍 Track My Package'
        };
        response.quickReplies = ['Get a quote', 'Book new shipment', 'Contact support'];
        setContext(prev => ({ ...prev, lastTopic: 'tracking' }));
        break;

      case 'booking':
        if (!user) {
          response.text = 'To create a booking, you\'ll need to sign in first. Click the button below to sign in or create an account. Once logged in, you can track all your shipments and manage bookings from your dashboard.';
          response.action = {
            type: 'open_login',
            label: '🔐 Sign In / Create Account'
          };
          response.quickReplies = ['Get a quote first', 'Track package', 'Learn more'];
        } else {
          response.text = 'Great! I can help you create a new booking. Click the button below to get started with your shipment details.';
          response.action = {
            type: 'open_booking',
            label: '📦 Create Booking'
          };
          response.quickReplies = ['Get a quote first', 'View my bookings', 'Track package'];
        }
        setContext(prev => ({ ...prev, lastTopic: 'booking' }));
        break;

      case 'delivery_time':
        response.text = 'Our delivery times are:\n\n⚡ **Express**: 1-2 business days\n📦 **Standard**: 2-4 business days\n🏙️ **Same-day**: Available in Auckland, Wellington, and Christchurch\n\nDelivery times may vary based on distance and location.';
        response.quickReplies = ['Get a quote', 'Check pricing', 'Book shipment', 'Track package'];
        break;

      case 'weight':
        response.text = 'We handle packages from **0.5kg up to 30kg**.\n\n• Small items (up to 5kg): Standard rates\n• Medium items (5-15kg): Standard rates\n• Large items (15-30kg): May require quote\n• Over 30kg: Contact us for custom quote\n\nOversized items may have additional handling fees.';
        response.quickReplies = ['Get a quote', 'Book shipment', 'Contact support'];
        break;

      case 'payment':
        response.text = 'We accept:\n\n💳 All major credit cards (Visa, Mastercard, Amex)\n🏦 Bank transfers\n📄 Invoicing through Xero\n\nPayment is secure and you\'ll receive an invoice after booking.';
        response.quickReplies = ['Book shipment', 'Get a quote', 'Track package'];
        break;

      case 'cancel':
        response.text = '**Cancellation Policy:**\n\n✅ Free cancellation within 2 hours of booking\n⚠️ Cancellation fees may apply after 2 hours\n✉️ Email support@nsjexpress.com with your booking ID\n\nNeed to cancel a booking?';
        response.quickReplies = ['Contact support', 'View my bookings', 'Make new booking'];
        break;

      case 'insurance':
        response.text = '**Insurance Coverage:**\n\n✓ Basic coverage up to $100 (included free)\n✓ Additional coverage at 2% of declared value\n✓ Available during booking process\n\nAll shipments are covered for peace of mind!';
        response.quickReplies = ['Get a quote', 'Book shipment', 'Learn more'];
        break;

      case 'locations':
        response.text = 'We deliver throughout **New Zealand** 🇳🇿:\n\n• Auckland, Wellington, Christchurch\n• Hamilton, Tauranga, Dunedin\n• Palmerston North, Nelson, Rotorua\n• And many more locations!\n\nSame-day delivery available in major cities.';
        response.quickReplies = ['Get a quote', 'Check delivery times', 'Book shipment'];
        break;

      case 'support':
        response.text = '**Contact Us:**\n\n📧 support@nsjexpress.com\n📞 1-800-NSJ-EXPRESS\n\n**Business Hours:**\n• Mon-Fri: 8AM - 6PM\n• Saturday: 9AM - 1PM\n• Sunday: Closed';
        response.quickReplies = ['Get a quote', 'Track package', 'Book shipment'];
        break;

      case 'account':
        if (!user) {
          response.text = 'Creating an account lets you:\n\n✓ Track all your shipments\n✓ Save favorite locations\n✓ View booking history\n✓ Get faster checkout\n\nReady to get started?';
          response.action = {
            type: 'open_login',
            label: '🔐 Sign In / Create Account'
          };
          response.quickReplies = ['Get a quote', 'Track package', 'Learn more'];
        } else {
          response.text = 'You\'re already logged in! 🎉 You can view all your bookings, saved locations, and tracking info from your dashboard.';
          response.quickReplies = ['Get a quote', 'Book shipment', 'Track package'];
        }
        break;

      default:
        if (lower.includes('yes') || lower.includes('yeah') || lower.includes('sure')) {
          response.text = 'Great! What else can I help you with?';
          response.quickReplies = ['Get a quote', 'Track package', 'Book shipment', 'Contact support'];
        } else if (lower.includes('no') || lower.includes('nope')) {
          response.text = 'No problem! Let me know if you need anything else.';
          response.quickReplies = ['Get a quote', 'Track package', 'Book shipment'];
        } else {
          response.text = 'I\'m not quite sure about that. Here are some things I can help you with:\n\n📦 Get shipping quotes\n📍 Track packages\n📅 Book shipments\n💰 Check pricing\n📞 Contact support\n\nWhat would you like to do?';
          response.quickReplies = ['Get a quote', 'Track package', 'Book shipment', 'Contact support'];
        }
    }

    return response as Message;
  };

  const saveMessageToDatabase = async (message: Message) => {
    if (!user) return;

    try {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        message: message.text,
        sender: message.sender,
        created_at: message.timestamp.toISOString(),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleSend = (messageText?: string) => {
    const text = messageText || inputValue;
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setContext(prev => ({
      ...prev,
      conversationHistory: [...prev.conversationHistory, text].slice(-5),
    }));

    saveMessageToDatabase(userMessage);

    setTimeout(() => {
      const botMessage = getBotResponse(text);
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
      saveMessageToDatabase(botMessage);
    }, Math.random() * 800 + 600);
  };

  const handleQuickReply = (reply: string) => {
    handleSend(reply);
  };

  const handleAction = (action: Message['action']) => {
    if (!action) return;

    switch (action.type) {
      case 'open_quote':
        onOpenQuote?.();
        setIsOpen(false);
        break;
      case 'open_tracking':
        onOpenTracking?.();
        setIsOpen(false);
        break;
      case 'open_booking':
        onOpenBooking?.();
        setIsOpen(false);
        break;
      case 'open_login':
        onOpenLogin?.();
        setIsOpen(false);
        break;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 flex items-center gap-2 group hover:scale-105"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-semibold">
            AI Assistant
          </span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full relative">
                <Bot className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold">NSJ AI Assistant</h3>
                <p className="text-xs text-purple-100 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Online • Instant replies
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200 hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
            {messages.map((message) => (
              <div key={message.id}>
                <div
                  className={`flex gap-3 animate-in slide-in-from-bottom-2 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white'
                      : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'
                  }`}>
                    {message.sender === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex flex-col max-w-[75%] gap-2">
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-sm ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-tr-none'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'user' ? 'text-purple-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {message.action && message.sender === 'bot' && (
                      <button
                        onClick={() => handleAction(message.action)}
                        className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
                      >
                        {message.action.label}
                      </button>
                    )}
                    {message.quickReplies && message.sender === 'bot' && (
                      <div className="flex flex-wrap gap-2">
                        {message.quickReplies.map((reply, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuickReply(reply)}
                            className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-full transition-all duration-200 hover:shadow-md hover:scale-105"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 animate-in slide-in-from-bottom-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200 text-sm"
                disabled={isTyping}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                {isTyping ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
