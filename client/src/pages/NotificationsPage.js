import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/apiClient';
import dayjs from 'dayjs';

export default function NotificationsPage({ language }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, [filter, typeFilter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== 'all') {
        params.status = filter;
      }
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      const response = await apiClient.get('/notifications', { params });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('[NotificationsPage] Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n)
      );
    } catch (error) {
      console.error('[NotificationsPage] Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: 'read' }))
      );
    } catch (error) {
      console.error('[NotificationsPage] Error marking all as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (notification.status === 'unread') {
      await handleMarkRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'passport_expiry': '🛂',
      'visa_expiry': '✈️',
      'contract_expiry': '📄',
      'license_expiry': '📜',
      'vat_due': '💰',
      'invoice_due': '🧾'
    };
    return icons[type] || '🔔';
  };

  const getTypeLabel = (type) => {
    const labels = {
      'passport_expiry': 'Passport Expiry',
      'visa_expiry': 'Visa Expiry',
      'contract_expiry': 'Contract Expiry',
      'license_expiry': 'License Expiry',
      'vat_due': 'VAT Due',
      'invoice_due': 'Invoice Due'
    };
    return labels[type] || type;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return dayjs(date).format('DD MMM YYYY');
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  return (
    <div className={`space-y-6 ${language === 'ar' ? 'rtl' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-dark"
          >
            Mark All Read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Status:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="passport_expiry">Passport Expiry</option>
            <option value="visa_expiry">Visa Expiry</option>
            <option value="contract_expiry">Contract Expiry</option>
            <option value="license_expiry">License Expiry</option>
            <option value="vat_due">VAT Due</option>
            <option value="invoice_due">Invoice Due</option>
          </select>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No notifications found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {notifications.map((notification) => (
                  <tr
                    key={notification.id}
                    className={`transition hover:bg-slate-50 ${
                      notification.status === 'unread' ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                        <span className="text-sm text-slate-900">
                          {getTypeLabel(notification.type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {notification.message}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {formatDate(notification.dueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          notification.status === 'unread'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {notification.status === 'unread' ? 'Unread' : 'Read'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {notification.status === 'unread' && (
                          <button
                            onClick={() => handleMarkRead(notification.id)}
                            className="text-primary hover:text-primary-dark font-medium"
                          >
                            Mark Read
                          </button>
                        )}
                        {notification.link && (
                          <button
                            onClick={() => handleNotificationClick(notification)}
                            className="text-primary hover:text-primary-dark font-medium"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

