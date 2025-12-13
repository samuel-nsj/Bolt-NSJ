import { Download, Printer, Mail } from 'lucide-react';
import { Booking } from '../lib/supabase';

interface ShippingLabelProps {
  booking: Booking;
  onClose: () => void;
}

export default function ShippingLabel({ booking, onClose }: ShippingLabelProps) {
  const handleDownload = () => {
    const element = document.getElementById('shipping-label');
    if (!element) return;

    // In production, use a library like html2canvas or jsPDF
    // For now, we'll use print functionality
    window.print();
  };

  const handleEmail = () => {
    // In production, integrate with email service
    alert('Label will be emailed to ' + booking.pickup_contact_email);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Shipping Label</h2>
          <div className="flex gap-2">
            <button
              onClick={handleEmail}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-8">
          <div
            id="shipping-label"
            className="bg-white border-4 border-black p-8 space-y-6 print:border-2"
            style={{ width: '6in', minHeight: '4in' }}
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div>
                <img
                  src="/NSJ Express Logo (Socials Profile Pic).png"
                  alt="NSJ Express"
                  className="h-16 mb-2"
                />
                <p className="text-xs">www.nsjexpress.com</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{booking.tracking_number}</div>
                <p className="text-xs mt-1">Tracking Number</p>
              </div>
            </div>

            {/* From Section */}
            <div className="border-2 border-black p-4">
              <div className="text-xs font-bold mb-2 uppercase">From:</div>
              <div className="space-y-1">
                <div className="font-bold text-sm">{booking.pickup_contact_name}</div>
                {booking.pickup_company_name && (
                  <div className="text-sm">{booking.pickup_company_name}</div>
                )}
                <div className="text-sm">{booking.pickup_address}</div>
                <div className="text-sm">
                  {booking.pickup_suburb}, {booking.pickup_state} {booking.pickup_postcode}
                </div>
                {booking.pickup_contact_phone && (
                  <div className="text-sm">Ph: {booking.pickup_contact_phone}</div>
                )}
              </div>
            </div>

            {/* To Section */}
            <div className="border-2 border-black p-4">
              <div className="text-xs font-bold mb-2 uppercase">To:</div>
              <div className="space-y-1">
                <div className="font-bold text-lg">{booking.delivery_contact_name}</div>
                {booking.delivery_company_name && (
                  <div className="text-base">{booking.delivery_company_name}</div>
                )}
                <div className="text-base">{booking.delivery_address}</div>
                <div className="text-xl font-bold">
                  {booking.delivery_suburb}, {booking.delivery_state} {booking.delivery_postcode}
                </div>
                {booking.delivery_contact_phone && (
                  <div className="text-sm">Ph: {booking.delivery_contact_phone}</div>
                )}
              </div>
            </div>

            {/* Package Details */}
            <div className="grid grid-cols-3 gap-4 border-t-2 border-black pt-4">
              <div>
                <div className="text-xs font-bold uppercase">Weight</div>
                <div className="text-lg font-bold">{booking.weight_value} {booking.weight_units}</div>
              </div>
              {booking.service_level && (
                <div>
                  <div className="text-xs font-bold uppercase">Service</div>
                  <div className="text-sm">{booking.service_level}</div>
                </div>
              )}
              <div>
                <div className="text-xs font-bold uppercase">Date</div>
                <div className="text-sm">
                  {new Date(booking.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Barcode Placeholder */}
            <div className="border-2 border-black p-4 flex items-center justify-center">
              <div className="text-center">
                <div className="font-mono text-2xl tracking-widest mb-2">
                  *{booking.tracking_number}*
                </div>
                <div className="text-xs text-gray-600">
                  Scan barcode to track shipment
                </div>
              </div>
            </div>

            {/* Footer */}
            {booking.description && (
              <div className="border-t border-gray-300 pt-2">
                <div className="text-xs font-bold">Contents:</div>
                <div className="text-xs">{booking.description}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #shipping-label, #shipping-label * {
            visibility: visible;
          }
          #shipping-label {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
