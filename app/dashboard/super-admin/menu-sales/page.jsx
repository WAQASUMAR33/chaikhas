'use client';

/**
 * Menu Items Sales List Page
 * Show sales per menu item
 * Uses real API: get_menu_sales.php
 */

import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Alert from '@/components/ui/Alert';
import { apiPost, getTerminal } from '@/utils/api';
import { formatPKR } from '@/utils/format';
import { BarChart3 } from 'lucide-react';

export default function MenuSalesListPage() {
  const [menuSales, setMenuSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily'); // daily, weekly, monthly
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchMenuSales();
  }, [period]);

  /**
   * Fetch menu sales data from API
   * API: get_menu_sales.php (POST with terminal and period)
   */
  const fetchMenuSales = async () => {
    setLoading(true);
    try {
      const terminal = getTerminal();
      const result = await apiPost('/get_menu_sales.php', { terminal, period });
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // Map API response
        const mappedSales = result.data.map((item) => ({
          id: item.dish_id,
          dish_id: item.dish_id,
          name: item.name || '-',
          category: item.category || '-',
          quantity_sold: item.quantity_sold || 0,
          total_revenue: item.total_revenue || 0,
        }));
        setMenuSales(mappedSales);
      } else if (result.data && result.data.success === false) {
        setAlert({ type: 'error', message: result.data.message || 'Failed to load menu sales data' });
        setMenuSales([]);
      } else {
        setMenuSales([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching menu sales:', error);
      setAlert({ type: 'error', message: 'Failed to load menu sales data: ' + (error.message || 'Network error') });
      setLoading(false);
      setMenuSales([]);
    }
  };

  /**
   * Table columns configuration
   */
  const columns = [
    { 
      header: 'ID', 
      accessor: 'dish_id',
      className: 'w-20',
      wrap: false,
    },
    { 
      header: 'Menu Item', 
      accessor: 'name',
      className: 'min-w-[200px]',
    },
    { 
      header: 'Category', 
      accessor: 'category',
      className: 'min-w-[150px]',
    },
    { 
      header: 'Quantity Sold', 
      accessor: 'quantity_sold',
      className: 'w-32',
      wrap: false,
    },
    {
      header: 'Total Revenue',
      accessor: (row) => <span className="font-semibold">{formatPKR(row.total_revenue || 0)}</span>,
      className: 'w-40',
      wrap: false,
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-[#FF5F15]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Items Sales List</h1>
            <p className="text-gray-600 mt-1">View sales statistics for each menu item</p>
          </div>
        </div>

        {/* Alert Message */}
        {alert.message && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert({ type: '', message: '' })}
          />
        )}

        {/* Period Selector */}
        <div className="flex gap-2">
          {['daily', 'weekly', 'monthly'].map((p) => (
            <Button
              key={p}
              variant={period === p ? 'primary' : 'secondary'}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Button>
          ))}
        </div>

        {/* Menu Sales Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Loading menu sales data...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={menuSales}
            emptyMessage="No menu sales data found"
          />
        )}
      </div>
    </SuperAdminLayout>
  );
}
