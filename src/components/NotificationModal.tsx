'use client';

import React, { useState } from 'react';
import { 
  AppNotification, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '@/lib/notificationService';
import { 
  Bell, 
  CheckCheck, 
  X, 
  ArrowDown, 
  ArrowUp, 
  AlertTriangle, 
  ShieldCheck, 
  Bot, 
  Gift, 
  ExternalLink,
  Clock
} from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  telegramId?: string;
  onRefreshNotifications?: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  telegramId = '494232782',
  onRefreshNotifications,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'TRANSACTIONS' | 'BROADCAST' | 'AFFILIATE'>('ALL');

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    const allIds = notifications.map(n => n.id);
    markAllNotificationsAsRead(telegramId, allIds);
    if (onRefreshNotifications) onRefreshNotifications();
  };

  const handleItemClick = (notif: AppNotification) => {
    markNotificationAsRead(telegramId, notif.id);
    if (onRefreshNotifications) onRefreshNotifications();
  };

  const filtered = notifications.filter(n => {
    if (filter === 'ALL') return true;
    if (filter === 'TRANSACTIONS') return n.type === 'DEPOSIT' || n.type === 'WITHDRAW';
    if (filter === 'BROADCAST') return n.type === 'BROADCAST' || n.type === 'BOT';
    if (filter === 'AFFILIATE') return n.type === 'AFFILIATE';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Vừa xong';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      });
    } catch {
      return 'Vừa xong';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b0e17] border-2 border-[#1f293d] rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1f293d] flex items-center justify-between bg-[#131927]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                TRUNG TÂM THÔNG BÁO
              </h3>
              <span className="text-[10px] text-gray-400 font-mono block">
                {unreadCount > 0 ? `${unreadCount} thông báo mới chưa đọc` : 'Không có thông báo mới'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-2.5 py-1 rounded-xl bg-[#0b0e17] hover:bg-[#1f293d] text-gray-300 hover:text-white border border-[#1f293d] text-[10px] font-bold flex items-center gap-1 transition-all"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#00df89]" />
                <span>Đã Đọc Hết</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#0b0e17] text-gray-400 hover:text-white border border-[#1f293d] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Category Tabs */}
        <div className="p-2.5 bg-[#0b0e17] border-b border-[#1f293d] flex items-center gap-1 overflow-x-auto text-[10px] font-black uppercase">
          {[
            { id: 'ALL', label: `TẤT CẢ (${notifications.length})` },
            { id: 'TRANSACTIONS', label: 'NẠP & RÚT' },
            { id: 'BROADCAST', label: 'HỆ THỐNG' },
            { id: 'AFFILIATE', label: 'CHIẾT KHẤU' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                filter === tab.id
                  ? 'bg-[#ff5500] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white bg-[#131927]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="p-3 overflow-y-auto space-y-2 flex-1 max-h-[480px]">
          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Bell className="w-8 h-8 mx-auto text-gray-600" />
              <p className="text-xs text-gray-500 font-bold">Chưa có thông báo nào trong danh mục này</p>
            </div>
          ) : (
            filtered.map((notif) => {
              const isUnread = !notif.isRead;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 relative ${
                    isUnread
                      ? 'bg-[#131927] border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : 'bg-[#0b0e17] border-[#1f293d] opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Unread indicator dot */}
                  {isUnread && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] animate-pulse" />
                  )}

                  <div className="flex items-center gap-2">
                    {/* Icon by Type */}
                    {notif.type === 'DEPOSIT' && (
                      <div className="w-6 h-6 rounded-lg bg-[#00df89]/20 text-[#00df89] flex items-center justify-center">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {notif.type === 'WITHDRAW' && (
                      <div className="w-6 h-6 rounded-lg bg-[#ff2d55]/20 text-[#ff2d55] flex items-center justify-center">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {notif.type === 'BROADCAST' && (
                      <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {notif.type === 'BOT' && (
                      <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {notif.type === 'AFFILIATE' && (
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Gift className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <h4 className="text-xs font-black text-white pr-4">
                      {notif.title}
                    </h4>
                  </div>

                  <p className="text-[11px] text-gray-300 leading-relaxed font-sans pl-8">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between pl-8 pt-1 text-[9px] font-mono text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(notif.timestamp)}
                    </span>

                    {notif.actionUrl && (
                      <a
                        href={notif.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-amber-400 hover:text-amber-300 font-bold uppercase flex items-center gap-1 border-b border-amber-400/40"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>{notif.actionText || 'Mở liên kết'}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#131927] border-t border-[#1f293d] text-center">
          <span className="text-[10px] text-gray-400 font-mono">
            Hệ thống thông báo tự động Spartan Notifications Engine
          </span>
        </div>
      </div>
    </div>
  );
};
