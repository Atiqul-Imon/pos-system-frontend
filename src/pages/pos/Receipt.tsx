import { useEffect } from 'react';
import type { Transaction } from '../../types/index.js';

interface ReceiptProps {
  transaction: Transaction;
  storeName?: string;
  storeCode?: string;
  onClose: () => void;
  onPrint: () => void;
}

const Receipt = ({ transaction, storeName, storeCode, onClose, onPrint }: ReceiptProps) => {
  useEffect(() => {
    // Focus on print button when receipt opens
    // Auto-print can be enabled here if needed
  }, []);

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toFixed(2)}`;
  };

  return (
    <>
      {/* Modal Overlay - Hidden when printing */}
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50 print:hidden">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4 max-h-[90vh] overflow-y-auto">
          {/* Header with buttons - hidden when printing */}
          <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-xl font-mercellus text-gray-800">Receipt</h2>
            <div className="flex space-x-2">
              <button
                onClick={onPrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Print
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* Receipt Content - Visible in modal and when printing */}
          <div id="receipt-content" className="p-6">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-mercellus font-bold mb-2">POS system</h1>
              {storeName && (
                <p className="text-lg font-semibold">{storeName}</p>
              )}
              {storeCode && (
                <p className="text-sm text-gray-600">Store Code: {storeCode}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Thank you for your purchase!
              </p>
            </div>

            <div className="border-t border-b border-gray-300 py-2 my-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Transaction #:</span>
                <span className="font-semibold">{transaction.transactionNumber}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Date:</span>
                <span>{formatDate(transaction.createdAt)}</span>
              </div>
              {transaction.cashier && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Cashier:</span>
                  <span>
                    {typeof transaction.cashier === 'object'
                      ? transaction.cashier.name
                      : 'N/A'}
                  </span>
                </div>
              )}
              {transaction.customer && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Customer:</span>
                  <span>
                    {typeof transaction.customer === 'object' && 'name' in transaction.customer
                      ? transaction.customer.name
                      : 'Walk-in Customer'}
                  </span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2">Item</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-2">
                        <div className="font-medium">
                          {typeof item.product === 'object'
                            ? item.product.name
                            : 'Product'}
                        </div>
                        {typeof item.product === 'object' && item.product.sku && (
                          <div className="text-xs text-gray-500">
                            SKU: {item.product.sku}
                          </div>
                        )}
                      </td>
                      <td className="text-center py-2">{item.quantity}</td>
                      <td className="text-right py-2">{formatCurrency(item.price)}</td>
                      <td className="text-right py-2 font-medium">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-b border-gray-300 py-3 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal:</span>
                <span>{formatCurrency(transaction.subtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-sm mb-1 text-red-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(transaction.discount)}</span>
                </div>
              )}
              {transaction.tax > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span>Tax:</span>
                  <span>{formatCurrency(transaction.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-gray-300">
                <span>Total:</span>
                <span>{formatCurrency(transaction.total)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-semibold capitalize">
                  {transaction.paymentMethod.replace('_', ' ')}
                </span>
              </div>
              {transaction.paymentDetails && (
                <>
                  {transaction.paymentDetails.cashAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cash:</span>
                      <span>{formatCurrency(transaction.paymentDetails.cashAmount)}</span>
                    </div>
                  )}
                  {transaction.paymentDetails.cardAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Card:</span>
                      <span>{formatCurrency(transaction.paymentDetails.cardAmount)}</span>
                    </div>
                  )}
                  {transaction.paymentDetails.mobileAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Mobile Payment:</span>
                      <span>{formatCurrency(transaction.paymentDetails.mobileAmount)}</span>
                    </div>
                  )}
                  {transaction.paymentDetails.change > 0 && (
                    <div className="flex justify-between text-sm font-semibold mt-1">
                      <span>Change:</span>
                      <span>{formatCurrency(transaction.paymentDetails.change)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Loyalty Points Information */}
            {(transaction.loyaltyPointsEarned !== undefined && transaction.loyaltyPointsEarned > 0) ||
            (transaction.loyaltyPointsRedeemed !== undefined && transaction.loyaltyPointsRedeemed > 0) ? (
              <div className="mt-4 pt-4 border-t border-gray-300">
                {transaction.loyaltyPointsEarned !== undefined && transaction.loyaltyPointsEarned > 0 && (
                  <div className="text-center mb-2">
                    <p className="text-xs font-semibold text-green-600">
                      Points Earned: {transaction.loyaltyPointsEarned}
                    </p>
                    {transaction.customer && typeof transaction.customer === 'object' && 'loyaltyPoints' in transaction.customer && (
                      <p className="text-xs text-gray-600 mt-1">
                        Total Points: {transaction.customer.loyaltyPoints}
                      </p>
                    )}
                  </div>
                )}
                {transaction.loyaltyPointsRedeemed !== undefined && transaction.loyaltyPointsRedeemed > 0 && (
                  <div className="text-center">
                    <p className="text-xs font-semibold text-blue-600">
                      Points Redeemed: {transaction.loyaltyPointsRedeemed} (100 pts = ৳10)
                    </p>
                    {transaction.customer && typeof transaction.customer === 'object' && 'loyaltyPoints' in transaction.customer && (
                      <p className="text-xs text-gray-600 mt-1">
                        Remaining Points: {transaction.customer.loyaltyPoints}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-300">
              <p>Have a great day!</p>
              <p className="mt-2">
                For inquiries, please contact us at your store
              </p>
            </div>

            {/* Notes */}
            {transaction.notes && (
              <div className="mt-4 pt-4 border-t border-gray-300">
                <p className="text-xs text-gray-600">
                  <strong>Notes:</strong> {transaction.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          
          /* Hide everything except receipt content */
          body * {
            visibility: hidden;
          }
          
          #receipt-content,
          #receipt-content * {
            visibility: visible;
          }
          
          /* Style receipt for printing */
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0;
            padding: 5mm;
            background: white;
            font-size: 11px;
            box-shadow: none;
          }
          
          #receipt-content h1 {
            font-size: 18px;
            margin-bottom: 8px;
          }
          
          #receipt-content table {
            font-size: 10px;
          }
          
          #receipt-content th,
          #receipt-content td {
            padding: 4px 2px;
          }
          
          /* Hide buttons and modal overlay */
          button,
          .print\\:hidden,
          .print\\:hidden * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>
    </>
  );
};

export default Receipt;
