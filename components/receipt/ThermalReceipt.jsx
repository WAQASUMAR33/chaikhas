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
      src="/logo.png" 
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

export default function ThermalReceipt({ order, items, branchName = '' }) {
  // Extract order data with fallbacks
  const orderId = order?.order_id || order?.id || order?.orderid || 'N/A';
  const orderNumber = order?.orderid || (orderId !== 'N/A' ? `ORD-${orderId}` : 'N/A');
  const orderType = order?.order_type || order?.orderType || 'Dine In';
  const orderDate = order?.created_at || order?.date || order?.createdAt || new Date().toISOString();
  const formattedDate = formatDateTime(orderDate) || new Date(orderDate).toLocaleString();
  
  // Calculate totals
  const subtotal = parseFloat(order?.g_total_amount || order?.total || order?.subtotal || 0);
  const serviceCharge = parseFloat(order?.service_charge || order?.serviceCharge || 0);
  const discount = parseFloat(order?.discount_amount || order?.discount || 0);
  const netTotal = parseFloat(order?.net_total_amount || order?.netTotal || order?.net_total || order?.final_amount || subtotal);
  
  // Get items array
  const orderItems = items || order?.items || [];
  
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
          margin: 0 auto;
          padding: 10px;
          background: white;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
        }
        
        @media print {
          .receipt-container {
            width: 80mm;
            margin: 0;
            padding: 5mm;
            page-break-after: avoid;
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
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
        }
        
        .restaurant-name {
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 1px;
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        
        .branch-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .receipt-info {
          text-align: center;
          margin-bottom: 15px;
          font-size: 11px;
        }
        
        .info-row {
          margin: 4px 0;
        }
        
        .info-label {
          font-weight: bold;
        }
        
        .order-type {
          display: inline-block;
          padding: 2px 8px;
          border: 1px solid #000;
          margin-top: 5px;
          font-weight: bold;
        }
        
        .items-table {
          width: 100%;
          margin: 15px 0;
          border-collapse: collapse;
        }
        
        .items-table thead {
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
        }
        
        .items-table th {
          text-align: left;
          padding: 5px 2px;
          font-weight: bold;
          font-size: 11px;
          text-transform: uppercase;
        }
        
        .items-table td {
          padding: 4px 2px;
          font-size: 11px;
        }
        
        .items-table tbody tr {
          border-bottom: 1px dotted #ccc;
        }
        
        .item-name {
          width: 45%;
          text-align: left;
        }
        
        .item-price {
          width: 18%;
          text-align: right;
        }
        
        .item-qty {
          width: 12%;
          text-align: center;
        }
        
        .item-total {
          width: 25%;
          text-align: right;
          font-weight: bold;
        }
        
        .totals-section {
          margin-top: 15px;
          border-top: 1px solid #000;
          padding-top: 10px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
          font-size: 11px;
        }
        
        .total-label {
          text-align: left;
        }
        
        .total-value {
          text-align: right;
          font-weight: bold;
        }
        
        .net-total {
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          padding: 8px 0;
          margin: 10px 0;
          font-size: 14px;
          font-weight: bold;
        }
        
        .thank-you {
          text-align: center;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px dashed #000;
          font-size: 14px;
          font-weight: bold;
          letter-spacing: 2px;
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
        </div>

        <div className="divider">━━━━━━━━━━━━━━━━━━━━━━━━</div>

        {/* Items Table */}
        {orderItems.length > 0 && (
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
                const itemName = item.dish_name || item.name || item.title || 'Item';
                const itemPrice = parseFloat(item.price || item.rate || 0);
                const itemQty = parseInt(item.quantity || item.qty || 1);
                const itemTotal = parseFloat(item.total_amount || item.total || itemPrice * itemQty);
                
                // Truncate long item names
                const displayName = itemName.length > 25 ? itemName.substring(0, 22) + '...' : itemName;
                
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
          
          {order?.payment_mode && (
            <div className="total-row" style={{ marginTop: '10px', fontSize: '10px' }}>
              <span className="total-label">Payment:</span>
              <span className="total-value">{order.payment_mode}</span>
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

