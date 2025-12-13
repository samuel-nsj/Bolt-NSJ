import { useState } from 'react';
import { Upload, Download, CheckCircle, XCircle, FileText, Loader } from 'lucide-react';

interface BulkBookingProps {
  onClose: () => void;
  onSubmit: (bookings: any[]) => Promise<void>;
}

export default function BulkBooking({ onClose, onSubmit }: BulkBookingProps) {
  const [file, setFile] = useState<File | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      const parsed = lines.slice(1)
        .filter(line => line.trim())
        .map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const booking: any = { id: index };
          headers.forEach((header, i) => {
            booking[header] = values[i];
          });
          return booking;
        });

      setBookings(parsed);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers = [
      'Pickup Name',
      'Pickup Address',
      'Pickup Suburb',
      'Pickup Postcode',
      'Delivery Name',
      'Delivery Address',
      'Delivery Suburb',
      'Delivery Postcode',
      'Weight (kg)',
      'Length (cm)',
      'Width (cm)',
      'Height (cm)',
      'Description',
    ];

    const csv = headers.join(',') + '\n' +
      'John Smith,123 Main St,Sydney,2000,Jane Doe,456 Oak Ave,Melbourne,3000,5,30,20,15,Electronics\n';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-booking-template.csv';
    a.click();
  };

  const handleSubmit = async () => {
    setProcessing(true);
    try {
      await onSubmit(bookings);
      setResults({ success: bookings.length, failed: 0 });
    } catch (error) {
      setResults({ success: 0, failed: bookings.length });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Bulk Booking</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!results ? (
            <>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <FileText className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-purple-900 mb-2">Upload Multiple Bookings</h3>
                    <p className="text-sm text-purple-700 mb-4">
                      Upload a CSV file with multiple shipments to book them all at once. Save time and streamline your shipping process.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download CSV Template
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-purple-400 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="bulk-upload"
                />
                <label
                  htmlFor="bulk-upload"
                  className="cursor-pointer flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 mb-1">
                      {file ? file.name : 'Choose CSV file or drag here'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports CSV files up to 10MB
                    </p>
                  </div>
                </label>
              </div>

              {bookings.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Preview ({bookings.length} bookings)
                    </h3>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 max-h-96 overflow-auto custom-scrollbar">
                    <div className="space-y-2">
                      {bookings.slice(0, 10).map((booking, index) => (
                        <div
                          key={index}
                          className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors"
                        >
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">From:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {booking['Pickup Suburb']} {booking['Pickup Postcode']}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">To:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {booking['Delivery Suburb']} {booking['Delivery Postcode']}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {bookings.length > 10 && (
                        <p className="text-center text-sm text-gray-500 py-2">
                          +{bookings.length - 10} more bookings...
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSubmit}
                      disabled={processing}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Processing {bookings.length} bookings...
                        </>
                      ) : (
                        <>
                          Process All Bookings
                        </>
                      )}
                    </button>
                    <button
                      onClick={onClose}
                      className="px-6 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Bulk Booking Complete!
              </h3>
              <p className="text-gray-600 mb-8">
                Successfully processed {results.success} bookings
                {results.failed > 0 && `, ${results.failed} failed`}
              </p>
              <button
                onClick={onClose}
                className="bg-gradient-to-r from-purple-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
