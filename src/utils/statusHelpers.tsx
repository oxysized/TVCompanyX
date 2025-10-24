// Status helpers with memoization for better performance

export const STATUS_TEXT: Record<string, string> = {
  pending: 'На рассмотрении',
  in_progress: 'В работе у агента',
  sent_to_commercial: 'Отправлена в коммерческий отдел',
  approved: 'Одобрена',
  rejected: 'Отклонена',
  paid: 'Оплачена',
  overdue: 'Просрочена',
} as const

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  sent_to_commercial: 'bg-purple-100 text-purple-800 border-purple-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  overdue: 'bg-orange-100 text-orange-800 border-orange-200',
} as const

export const getStatusText = (status: string): string => {
  return STATUS_TEXT[status] || 'Неизвестно'
}

export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200'
}

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => {
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)} ${className}`}>
      {getStatusText(status)}
    </span>
  )
}

// Memoized version for lists
import React from 'react'

export const MemoStatusBadge = React.memo(StatusBadge)
