'use client';

/**
 * Restaurant Khas Logo Component for Receipts
 * Simplified version optimized for thermal printing
 */

export default function ReceiptLogo() {
  return (
    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
      {/* Try to load logo image first, fallback to text */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
        <img 
          src="/logo.png" 
          alt="Restaurant Khas" 
          style={{
            maxWidth: '60mm',
            maxHeight: '30mm',
            height: 'auto',
            objectFit: 'contain'
          }}
          onError={(e) => {
            // Hide image on error, show text logo instead
            e.target.style.display = 'none';
            const parent = e.target.parentElement;
            if (!parent.querySelector('.text-logo')) {
              const textLogo = document.createElement('div');
              textLogo.className = 'text-logo';
              textLogo.innerHTML = `
                <div style="font-size: 20px; font-weight: bold; letter-spacing: 2px; margin-bottom: 3px;">RESTAURANT</div>
                <div style="font-size: 24px; font-weight: bold; letter-spacing: 3px;">KHAS</div>
                <div style="font-size: 10px; letter-spacing: 1px; margin-top: 2px; opacity: 0.8;">RK</div>
              `;
              parent.appendChild(textLogo);
            }
          }}
        />
      </div>
      {/* Fallback text logo (shown if image fails to load) */}
      <style jsx>{`
        .text-logo {
          font-family: 'Courier New', monospace;
          color: #000;
          text-align: center;
        }
      `}</style>
    </div>
  );
}

