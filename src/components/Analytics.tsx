import { useState, useEffect } from 'react';
import { TrendingUp, Package, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase, Booking } from '../lib/supabase';

export default function Analytics() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthName = now.toLocaleString('default', { month: 'long' });

  const monthlyBookings = bookings.filter(b => {
    const bookingDate = new Date(b.created_at);
    return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
  });

  const stats = {
    active: bookings.filter(b => b.status !== 'delivered' && b.status !== 'cancelled').length,
    completedMonthly: monthlyBookings.filter(b => b.status === 'delivered').length,
    totalSpendMonthly: monthlyBookings.reduce((sum, b) => sum + (parseFloat(b.estimated_price || '0') || 0), 0),
    inTransit: bookings.filter(b => b.status === 'in_transit').length,
    pending: bookings.filter(b => b.status === 'pending').length,
  };

  const recentBookings = bookings.slice(0, 5);

  const statusData = [
    { label: 'Delivered', value: stats.completedMonthly, color: 'bg-green-500' },
    { label: 'In Transit', value: stats.inTransit, color: 'bg-purple-500' },
    { label: 'Pending', value: stats.pending, color: 'bg-yellow-500' },
  ];

  const maxValue = Math.max(...statusData.map(s => s.value), 1);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 rounded-xl h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white hover-lift stagger-item">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <TrendingUp className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-1">{stats.active}</div>
          <div className="text-purple-100 text-sm">Active Shipments</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white hover-lift stagger-item">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-sm opacity-80">
              {monthlyBookings.length > 0 ? Math.round((stats.completedMonthly / monthlyBookings.length) * 100) : 0}%
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.completedMonthly}</div>
          <div className="text-purple-100 text-sm">Completed Shipments ({monthName})</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white hover-lift stagger-item">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <TrendingUp className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-1">${stats.totalSpendMonthly.toFixed(2)}</div>
          <div className="text-purple-100 text-sm">Total Spend ({monthName})</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 card-hover">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Shipment Status</h3>
          <div className="space-y-4">
            {statusData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{item.label}</span>
                  <span className="font-semibold text-gray-900">{item.value}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`${item.color} h-full rounded-full transition-all duration-1000 ease-out`}
                    style={{
                      width: `${(item.value / maxValue) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 card-hover">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Shipments</h3>
          <div className="space-y-4">
            {recentBookings.length > 0 ? (
              recentBookings.map((booking, index) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      booking.status === 'delivered' ? 'bg-green-500' :
                      booking.status === 'in_transit' ? 'bg-purple-500' :
                      'bg-yellow-500'
                    }`} />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {booking.tracking_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {booking.pickup_suburb} → {booking.delivery_suburb}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      ${parseFloat(booking.estimated_price || '0').toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {booking.status?.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No shipments yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 card-hover">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Overview</h3>
        <div className="grid grid-cols-7 gap-4">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
            const height = Math.random() * 100 + 20;
            return (
              <div key={day} className="text-center">
                <div className="h-32 flex items-end justify-center mb-2">
                  <div
                    className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-lg transition-all duration-1000 ease-out hover:from-purple-500 hover:to-purple-400 cursor-pointer"
                    style={{
                      height: `${height}%`,
                      animationDelay: `${index * 0.1}s`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600 font-medium">{day}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
