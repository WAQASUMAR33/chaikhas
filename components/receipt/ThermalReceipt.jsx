'use client';

/**
 * Thermal Printer Receipt Component
 * Clean, printer-friendly receipt layout for Restaurant Khas
 * Designed for 80mm thermal printers
 */

import { useState } from 'react';
import { formatPKR, formatDateTime } from '@/utils/format';

/**
 * Logo Component with Text Fallback
 */
function LogoWithFallback() {
  const [showFallback, setShowFallback] = useState(false);

  if (showFallback) {
    return (
      <div style={{ 
        fontFamily: "'Courier New', monospace",
        color: '#000',
        textAlign: 'center',
        padding: '5px 0'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '3px', textTransform: 'uppercase' }}>
          RESTAURANT
        </div>
        <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '3px', textTransform: 'uppercase' }}>
          KHAS
        </div>
      </div>
    );
  }

  return (
    <img 
      src="/assets/CHAIKHAS.PNG" 
      alt="Restaurant Khas Logo" 
      style={{
        maxWidth: '60mm',
        maxHeight: '30mm',
        height: 'auto',
        width: 'auto',
        objectFit: 'contain',
        display: 'block',
        margin: '0 auto'
      }}
      onError={() => setShowFallback(true)}
    />
  );
}

export default function ThermalReceipt({ order, items, branchName = '', showPaidAmount = false }) {
  // Extract order data with fallbacks
  const orderId = order?.order_id || order?.id || order?.orderid || 'N/A';
  const orderNumber = order?.orderid || (orderId !== 'N/A' ? `ORD-${orderId}` : 'N/A');
  const orderType = order?.order_type || order?.orderType || 'Dine In';
  const orderDate = order?.created_at || order?.date || order?.createdAt || order?.created_at || new Date().toISOString();
  const formattedDate = formatDateTime(orderDate) || new Date(orderDate).toLocaleString();
  
  // Calculate totals from items if order totals are missing
  const orderItems = items || order?.items || [];
  let calculatedSubtotal = 0;
  
  if (orderItems.length > 0) {
    calculatedSubtotal = orderItems.reduce((sum, item) => {
      const itemPrice = parseFloat(item.price || item.rate || item.unit_price || 0);
      const itemQty = parseInt(item.quantity || item.qty || item.qnty || 1);
      const itemTotal = parseFloat(item.total_amount || item.total || item.total_price || (itemPrice * itemQty));
      return sum + itemTotal;
    }, 0);
  }
  
  // Use order totals if available, otherwise calculate from items
  const subtotal = parseFloat(order?.g_total_amount || order?.total || order?.subtotal || calculatedSubtotal);
  const serviceCharge = parseFloat(order?.service_charge || order?.serviceCharge || 0);
  const discount = parseFloat(order?.discount_amount || order?.discount || order?.discount_amount || 0);
  const netTotal = parseFloat(order?.net_total_amount || order?.netTotal || order?.net_total || order?.grand_total || order?.final_amount || (subtotal + serviceCharge - discount));
  
  // Payment information
  const paymentMethod = order?.payment_method || order?.payment_mode || 'Cash';
  const paymentStatus = order?.payment_status || 'Unpaid';
  const cashReceived = parseFloat(order?.cash_received || 0);
  const change = parseFloat(order?.change || 0);
  const billId = order?.bill_id || null;
  
  // Customer information for credit sales
  const isCredit = paymentMethod === 'Credit' || order?.is_credit || paymentStatus === 'Credit';
  const customerName = order?.customer_name || null;
  const customerPhone = order?.customer_phone || null;
  
  // Format order type for display
  const displayOrderType = orderType === 'Dine In' ? 'Dine-In' : 
                          orderType === 'Take Away' ? 'Takeaway' : 
                          orderType === 'Delivery' ? 'Delivery' : orderType;

  return (
    <div className="receipt-container">
      {/* Receipt Styles - Optimized for thermal printing */}
      <style jsx>{`
        .receipt-container {
          width: 80mm;
          max-width: 80mm;
          min-width: 80mm;
          margin: 0 auto;
          padding: 8mm 5mm;
          background: white;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 11px;
          line-height: 1.4;
          color: #000;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          box-sizing: border-box;
        }
        
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          .receipt-container {
            width: 80mm !important;
            max-width: 80mm !important;
            min-width: 80mm !important;
            margin: 0 !important;
            padding: 5mm 4mm !important;
            page-break-after: avoid;
            box-sizing: border-box;
            position: relative;
          }
          
          /* Hide all other elements when printing */
          body * {
            visibility: hidden;
          }
          
          .receipt-container,
          .receipt-container * {
            visibility: visible;
          }
          
          .receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
          }
        }
        
        .receipt-logo {
          text-align: center;
          margin-bottom: 10px;
        }
        
        .receipt-logo img {
          max-width: 60mm;
          height: auto;
          object-fit: contain;
        }
        
        .receipt-header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 2px solid #FF5F15;
          padding-bottom: 12px;
        }
        
        .restaurant-name {
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 1px;
          margin-bottom: 5px;
          text-transform: uppercase;
          color: #FF5F15;
        }
        
        .branch-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #333;
        }
        
        .receipt-info {
          text-align: center;
          margin-bottom: 12px;
          font-size: 10px;
          line-height: 1.6;
        }
        
        .info-row {
          margin: 3px 0;
          word-wrap: break-word;
        }
        
        .info-label {
          font-weight: bold;
        }
        
        .order-type {
          display: inline-block;
          padding: 2px 6px;
          border: 1px solid #000;
          margin-top: 4px;
          font-weight: bold;
          font-size: 10px;
        }
        
        .items-table {
          width: 100%;
          margin: 12px 0;
          border-collapse: collapse;
          table-layout: fixed;
        }
        
        .items-table thead {
          border-top: 2px solid #FF5F15;
          border-bottom: 2px solid #FF5F15;
          background: #fff5f0;
        }
        
        .items-table th {
          text-align: left;
          padding: 5px 2px;
          font-weight: bold;
          font-size: 10px;
          text-transform: uppercase;
          color: #FF5F15;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .items-table td {
          padding: 4px 2px;
          font-size: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          word-wrap: break-word;
        }
        
        .items-table tbody tr {
          border-bottom: 1px dotted #ddd;
        }
        
        .items-table tbody tr:hover {
          background: #fffaf7;
        }
        
        .item-name {
          width: 42%;
          text-align: left;
          padding-right: 2px;
        }
        
        .item-price {
          width: 20%;
          text-align: right;
          padding: 0 2px;
        }
        
        .item-qty {
          width: 10%;
          text-align: center;
          padding: 0 2px;
        }
        
        .item-total {
          width: 28%;
          text-align: right;
          font-weight: bold;
          padding-left: 2px;
        }
        
        .totals-section {
          margin-top: 15px;
          border-top: 1px solid #000;
          padding-top: 10px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 4px 0;
          font-size: 10px;
          line-height: 1.5;
        }
        
        .total-label {
          text-align: left;
          flex: 1;
        }
        
        .total-value {
          text-align: right;
          font-weight: bold;
          min-width: 60px;
        }
        
        .net-total {
          border-top: 2px solid #FF5F15;
          border-bottom: 2px solid #FF5F15;
          padding: 8px 0;
          margin: 10px 0;
          font-size: 13px;
          font-weight: bold;
          background: #fff5f0;
          color: #FF5F15;
        }
        
        .thank-you {
          text-align: center;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 2px dashed #FF5F15;
          font-size: 15px;
          font-weight: bold;
          letter-spacing: 3px;
          color: #FF5F15;
        }
        
        .divider {
          text-align: center;
          margin: 10px 0;
          font-size: 10px;
        }
      `}</style>

      <div className="receipt-container">
        {/* Logo */}
        <div className="receipt-logo">
          <LogoWithFallback />
        </div>

        {/* Header */}
        <div className="receipt-header">
          {branchName && (
            <div className="branch-name">{branchName}</div>
          )}
        </div>

        {/* Order Information */}
        <div className="receipt-info">
          <div className="info-row">
            <span className="info-label">Date:</span> {formattedDate}
          </div>
          <div className="info-row">
            <span className="info-label">Order #:</span> {orderNumber}
          </div>
          <div className="info-row">
            <span className="order-type">{displayOrderType}</span>
          </div>
          {order?.table_number && orderType === 'Dine In' && (
            <div className="info-row">
              <span className="info-label">Table:</span> {order.table_number}
            </div>
          )}
          {isCredit && customerName && (
            <div className="info-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #ccc' }}>
              <span className="info-label" style={{ fontWeight: 'bold', color: '#FF5F15' }}>Credit Customer:</span>
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontWeight: 'bold' }}>{customerName}</div>
                {customerPhone && (
                  <div style={{ fontSize: '10px', color: '#666' }}>{customerPhone}</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="divider">━━━━━━━━━━━━━━━━━━━━━━━━</div>

        {/* Items Table */}
        {orderItems && orderItems.length > 0 ? (
          <table className="items-table">
            <thead>
              <tr>
                <th className="item-name">Item</th>
                <th className="item-price">Price</th>
                <th className="item-qty">Qty</th>
                <th className="item-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item, index) => {
                // Extract item data with multiple fallbacks - check all possible field name variations
                const itemName = item.dish_name || item.name || item.title || item.item_name || item.dishname || item.product_name || item.dishName || item.ItemName || 'Item';
                const itemPrice = parseFloat(item.price || item.rate || item.unit_price || 0);
                const itemQty = parseInt(item.quantity || item.qty || item.qnty || 1);
                // Calculate total if not provided
                const itemTotal = parseFloat(item.total_amount || item.total || item.total_price || (itemPrice * itemQty));
                
                // Truncate long item names for 80mm width (max ~28 chars)
                const maxItemNameLength = 28;
                const displayName = itemName.length > maxItemNameLength ? itemName.substring(0, maxItemNameLength - 3) + '...' : itemName;
                
                return (
                  <tr key={index}>
                    <td className="item-name">{displayName}</td>
                    <td className="item-price">{formatPKR(itemPrice)}</td>
                    <td className="item-qty">{itemQty}</td>
                    <td className="item-total">{formatPKR(itemTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px', fontSize: '11px', color: '#666' }}>
            No items found
          </div>
        )}

        <div className="divider">━━━━━━━━━━━━━━━━━━━━━━━━</div>

        {/* Totals Section */}
        <div className="totals-section">
          <div className="total-row">
            <span className="total-label">Subtotal:</span>
            <span className="total-value">{formatPKR(subtotal)}</span>
          </div>
          
          {serviceCharge > 0 && (
            <div className="total-row">
              <span className="total-label">Service Charge:</span>
              <span className="total-value">{formatPKR(serviceCharge)}</span>
            </div>
          )}
          
          {discount > 0 && (
            <div className="total-row">
              <span className="total-label">Discount:</span>
              <span className="total-value">-{formatPKR(discount)}</span>
            </div>
          )}
          
          <div className="total-row net-total">
            <span className="total-label">Net Total:</span>
            <span className="total-value">{formatPKR(netTotal)}</span>
          </div>
          
          {/* Payment Information */}
          {paymentMethod && (
            <div className="total-row" style={{ marginTop: '10px', fontSize: '11px', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
              <span className="total-label">Payment Method:</span>
              <span className="total-value">{paymentMethod}</span>
            </div>
          )}
          
          {/* Show paid amount if payment is completed */}
          {showPaidAmount && paymentStatus === 'Paid' && cashReceived > 0 && (
            <>
              <div className="total-row" style={{ fontSize: '11px', marginTop: '5px' }}>
                <span className="total-label">Amount Paid:</span>
                <span className="total-value" style={{ color: '#059669', fontWeight: 'bold' }}>{formatPKR(cashReceived)}</span>
              </div>
              {change > 0 && (
                <div className="total-row" style={{ fontSize: '11px' }}>
                  <span className="total-label">Change Returned:</span>
                  <span className="total-value" style={{ color: '#059669' }}>{formatPKR(change)}</span>
                </div>
              )}
              <div className="total-row" style={{ fontSize: '11px', marginTop: '5px', paddingTop: '5px', borderTop: '1px dashed #ccc' }}>
                <span className="total-label">Payment Status:</span>
                <span className="total-value" style={{ color: '#059669', fontWeight: 'bold' }}>✓ PAID</span>
              </div>
            </>
          )}
          
          {/* Bill ID if available */}
          {billId && (
            <div className="total-row" style={{ fontSize: '10px', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #ccc', color: '#666' }}>
              <span className="total-label">Bill ID:</span>
              <span className="total-value">#{billId}</span>
            </div>
          )}
        </div>

        {/* Thank You */}
        <div className="thank-you">
          THANK YOU
        </div>
        
        <div className="divider" style={{ marginTop: '15px', fontSize: '9px' }}>
          Visit us again!
        </div>
      </div>
    </div>
  );
}

