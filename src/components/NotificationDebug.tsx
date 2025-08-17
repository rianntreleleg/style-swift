import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const NotificationDebug: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!tenantId || !user) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching notifications for tenant:', tenantId);
      
      // Test RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_tenant_notifications', {
        p_tenant_id: tenantId,
        p_limit: 10,
        p_offset: 0,
        p_unread_only: false
      });
      
      console.log('RPC response:', { data: rpcData, error: rpcError });
      
      if (rpcError) {
        setError(`RPC Error: ${rpcError.message}`);
        console.error('RPC Error:', rpcError);
      } else {
        setNotifications(rpcData || []);
      }
      
      // Test count function
      const { data: countData, error: countError } = await supabase.rpc('count_unread_notifications', {
        p_tenant_id: tenantId
      });
      
      console.log('Count response:', { data: countData, error: countError });
      
      if (countError) {
        console.error('Count Error:', countError);
      } else {
        setUnreadCount(countData || 0);
      }
      
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Fetch Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const createTestNotification = async () => {
    if (!tenantId || !user) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('Creating test notification for tenant:', tenantId);
      
      const { data, error } = await supabase.rpc('test_notification_system', {
        p_tenant_id: tenantId
      });
      
      console.log('Test notification response:', { data, error });
      
      if (error) {
        setError(`Test Error: ${error.message}`);
        console.error('Test Error:', error);
      } else {
        console.log('Test notification created:', data);
      }
      
      // Refresh after creating test notification
      setTimeout(fetchNotifications, 1000);
      
    } catch (err) {
      console.error('Test creation error:', err);
      setError(`Test Creation Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId && user) {
      fetchNotifications();
    }
  }, [tenantId, user]);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Notification Debug</h3>
      
      <div className="mb-4">
        <p>Tenant ID: {tenantId}</p>
        <p>User: {user?.email}</p>
        <p>Unread Count: {unreadCount}</p>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>
      
      <div className="mb-4">
        <button 
          onClick={fetchNotifications}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          disabled={loading}
        >
          Refresh Notifications
        </button>
        
        <button 
          onClick={createTestNotification}
          className="bg-green-500 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          Create Test Notification
        </button>
      </div>
      
      <div>
        <h4 className="font-bold mb-2">Notifications ({notifications.length}):</h4>
        {notifications.length === 0 ? (
          <p>No notifications found</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification, index) => (
              <div key={index} className="bg-white p-2 rounded border">
                <p><strong>ID:</strong> {notification.id}</p>
                <p><strong>Type:</strong> {notification.type}</p>
                <p><strong>Title:</strong> {notification.title}</p>
                <p><strong>Message:</strong> {notification.message}</p>
                <p><strong>Read:</strong> {notification.is_read ? 'Yes' : 'No'}</p>
                <p><strong>Created:</strong> {notification.created_at}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};