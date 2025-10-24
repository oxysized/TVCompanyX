import React, { useEffect, useState } from 'react'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'
import { formatPhoneRu, formatCardNumber, normalizePhoneForServer } from '../../utils/format'
import { UserCircleIcon, EnvelopeIcon, PhoneIcon, CreditCardIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

const CustomerProfilePage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>({ name: '', first_name: '', middle_name: '', last_name: '', email: '', phone: '', bank_details: { card_number: '', holder_name: '' }, oldPassword: '', newPassword: '' })
  const [bankMissing, setBankMissing] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const resp = await fetch('/api/auth/me', { credentials: 'same-origin' })
        if (!resp.ok) throw new Error('Failed to load profile')
        const body = await resp.json()
        if (!mounted) return
        setForm((p:any) => ({
          ...p,
          name: body.name || '',
          first_name: body.first_name || '',
          middle_name: body.middle_name || '',
          last_name: body.last_name || '',
          email: body.email || '',
          phone: formatPhoneRu(body.phone || ''),
          bank_details: {
            card_number: formatCardNumber(body.bank_details?.card_number || ''),
            holder_name: body.bank_details?.holder_name || ''
          }
        }))
        const hasBank = body.bank_details && Object.keys(body.bank_details).length > 0
        setBankMissing(!hasBank)
      } catch (e) {
        console.error(e)
      } finally { if (mounted) setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [])

  const handleChange = (e: any) => {
    const { name, value } = e.target
    setForm((p: any) => ({ ...p, [name]: value }))
  }

  const handleBankChange = (e: any) => {
    const { name, value } = e.target
    let val = value
    if (name === 'card_number') val = formatCardNumber(value)
    setForm((p:any) => ({ ...p, bank_details: { ...p.bank_details, [name]: val } }))
    if (name === 'card_number') setBankMissing(!val || val.replace(/\s/g, '').length < 16)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: any = {
        first_name: form.first_name,
        middle_name: form.middle_name,
        last_name: form.last_name,
        name: form.name,
        email: form.email,
        phone: normalizePhoneForServer(form.phone),
        bank_details: { ...form.bank_details, card_number: form.bank_details.card_number.replace(/\s/g, '') }
      }
      if (form.oldPassword || form.newPassword) {
        payload.oldPassword = form.oldPassword
        payload.newPassword = form.newPassword
      }

      const resp = await fetch('/api/auth/profile', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error || 'Failed')
      }
      toast.success('Профиль обновлен')
    } catch (err: any) {
      toast.error(err.message || 'Ошибка')
    } finally { setLoading(false) }
  }

  return (
    <Layout role="customer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">Мой профиль</h1>
          <p className="mt-1 text-sm text-secondary-600">Управляйте своими персональными данными и настройками безопасности</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Personal Information Section */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-4 py-3 border-b border-primary-200">
              <div className="flex items-center">
                <UserCircleIcon className="h-5 w-5 text-primary-600 mr-2" />
                <h2 className="text-base font-semibold text-secondary-900">Личная информация</h2>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-700 mb-1.5">Имя</label>
                <input 
                  name="first_name" 
                  value={form.first_name} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" 
                  placeholder="Введите имя"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 mb-1.5">Отчество</label>
                <input 
                  name="middle_name" 
                  value={form.middle_name} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" 
                  placeholder="Введите отчество"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 mb-1.5">Фамилия</label>
                <input 
                  name="last_name" 
                  value={form.last_name} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" 
                  placeholder="Введите фамилию"
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-blue-200">
              <div className="flex items-center">
                <EnvelopeIcon className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-base font-semibold text-secondary-900">Контактные данные</h2>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-700 mb-1.5">Email адрес</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-4 w-4 text-secondary-400" />
                  </div>
                  <input 
                    name="email" 
                    value={form.email} 
                    onChange={handleChange} 
                    type="email"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 mb-1.5">Номер телефона</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhoneIcon className="h-4 w-4 text-secondary-400" />
                  </div>
                  <input 
                    name="phone" 
                    value={form.phone} 
                    onChange={handleChange} 
                    className="w-full pl-9 pr-3 py-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    placeholder="+7 (999) 999-99-99"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details Section */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 border-b border-green-200">
              <div className="flex items-center">
                <CreditCardIcon className="h-5 w-5 text-green-600 mr-2" />
                <h2 className="text-base font-semibold text-secondary-900">Банковские реквизиты</h2>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-700 mb-1.5">Номер карты</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCardIcon className="h-4 w-4 text-secondary-400" />
                  </div>
                  <input 
                    name="card_number" 
                    value={form.bank_details.card_number} 
                    onChange={handleBankChange} 
                    placeholder="0000 0000 0000 0000" 
                    className="w-full pl-9 pr-3 py-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-mono" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 mb-1.5">Владелец карты</label>
                <input 
                  name="holder_name" 
                  value={form.bank_details.holder_name} 
                  onChange={handleBankChange} 
                  placeholder="IVAN IVANOV" 
                  className="w-full px-3 py-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all uppercase" 
                />
              </div>
              {bankMissing && (
                <div className="flex items-start p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <svg className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-yellow-700">Заполните данные для выплат</p>
                </div>
              )}
              {!bankMissing && form.bank_details.card_number && (
                <div className="flex items-center p-2.5 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                  <p className="text-xs text-green-700">Данные заполнены корректно</p>
                </div>
              )}
            </div>
          </div>

          {/* Security Section - spans 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-secondary-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-4 py-3 border-b border-purple-200">
              <div className="flex items-center">
                <LockClosedIcon className="h-5 w-5 text-purple-600 mr-2" />
                <h2 className="text-base font-semibold text-secondary-900">Безопасность</h2>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-secondary-600 mb-4">Для изменения пароля введите текущий пароль и новый пароль</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary-700 mb-1.5">Текущий пароль</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-4 w-4 text-secondary-400" />
                    </div>
                    <input 
                      name="oldPassword" 
                      value={form.oldPassword} 
                      onChange={handleChange} 
                      type="password" 
                      placeholder="Введите текущий пароль" 
                      className="w-full pl-9 pr-3 py-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-700 mb-1.5">Новый пароль</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-4 w-4 text-secondary-400" />
                    </div>
                    <input 
                      name="newPassword" 
                      value={form.newPassword} 
                      onChange={handleChange} 
                      type="password" 
                      placeholder="Введите новый пароль" 
                      className="w-full pl-9 pr-3 py-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                    />
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-secondary-500">Оставьте поля пустыми, если не хотите менять пароль</p>
            </div>
          </div>

          {/* Save Button - spans remaining column */}
          <div className="lg:col-span-1 flex items-end">
            <div className="w-full flex flex-col gap-3">
              <button 
                type="submit"
                disabled={loading} 
                className="w-full px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4" />
                    Сохранить изменения
                  </>
                )}
              </button>
              <button 
                type="button"
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2.5 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50 transition-colors font-medium text-sm"
              >
                Отменить
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default CustomerProfilePage

