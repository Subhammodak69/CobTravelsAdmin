import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChartNoAxesCombined, Download, FileText, Filter, Landmark, Pencil, Plus, RefreshCw, Search, Trash2, Wallet } from 'lucide-react';
import ActionMenu from '../component/common/ActionMenu';
import ConfirmDeleteModal from '../component/common/ConfirmDeleteModal';
import CustomDatePicker from '../component/common/CustomDatePicker';
import ManagementTable from '../component/common/ManagementTable';
import Modal from '../component/common/Modal';
import Pagination from '../component/common/PaginationComponent';
import SelectField from '../component/common/SelectField';
import { apiCall, handleApiError } from '../utils/apiCall';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';
const today = new Date().toISOString().slice(0, 10);
const emptyFilters = { transaction_type: '', category: '', status: '', booking_id: '', customer_id: '', vendor_id: '', start_date: '', end_date: '', search: '' };
const emptyTransaction = { transaction_type: 'INCOME', category: '', amount: '', description: '', transaction_date: today, payment_method: '', booking_id: '', customer_id: '', vendor_id: '' };
const periodOptions = [{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }];
const reportTypeOptions = [{ value: 'income', label: 'Income' }, { value: 'expenses', label: 'Expenses' }, { value: 'referral_income', label: 'Referral income' }, { value: 'all', label: 'All activity' }];
const transactionTypeOptions = [{ value: '', label: 'All types' }, { value: 'INCOME', label: 'Income' }, { value: 'EXPENSE', label: 'Expense' }];
const transactionDirectionOptions = transactionTypeOptions.filter(option => option.value);
const transactionStatusOptions = [{ value: '', label: 'All statuses' }, { value: 'PENDING', label: 'Pending' }, { value: 'COMPLETED', label: 'Completed' }, { value: 'FAILED', label: 'Failed' }, { value: 'CANCELLED', label: 'Cancelled' }];
const views = [
  { id: 'transactions', label: 'Transactions', icon: Wallet },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'statistics', label: 'Statistics', icon: ChartNoAxesCombined },
];

const prettyLabel = value => String(value).replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const formatAmount = (value, currency = 'INR') => {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: /^[A-Za-z]{3}$/.test(currency || '') ? currency.toUpperCase() : 'INR', maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
};
const formatDate = value => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};
const getRows = payload => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};
const statusClass = status => {
  const value = String(status || '').toUpperCase();
  if (['COMPLETED', 'PAID', 'SUCCESS', 'SETTLED'].includes(value)) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (['FAILED', 'CANCELLED', 'REJECTED'].includes(value)) return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  if (['PENDING', 'PROCESSING', 'PARTIALLY_PAID'].includes(value)) return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

const FinancialManagement = () => {
  const [activeView, setActiveView] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [filterDraft, setFilterDraft] = useState(emptyFilters);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [transactionForm, setTransactionForm] = useState(emptyTransaction);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [bookingOptions, setBookingOptions] = useState([]);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [vendorOptions, setVendorOptions] = useState([]);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [referencesLoaded, setReferencesLoaded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [period, setPeriod] = useState('monthly');
  const [reportType, setReportType] = useState('income');
  const [dateRange, setDateRange] = useState({ start_date: '', end_date: '' });
  const [statistics, setStatistics] = useState(null);
  const [loadingStatistics, setLoadingStatistics] = useState(false);
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState('');

  const loadTransactions = useCallback(async (page = currentPage, limit = pageSize) => {
    setLoadingTransactions(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(limit) });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const response = await apiCall(`/api/v1/admin/financial/transactions?${params}`, 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.detail || 'Unable to load financial transactions');
      const items = getRows(payload);
      setTransactions(items);
      setTotalItems(Number(payload?.pagination?.total_items ?? payload?.data?.pagination?.total_items ?? items.length));
    } catch (error) {
      handleApiError(error, 'Unable to load financial transactions');
    } finally {
      setLoadingTransactions(false);
    }
  }, [currentPage, pageSize, filters]);

  useEffect(() => {
    loadTransactions(currentPage, pageSize);
  }, [loadTransactions, currentPage, pageSize]);

  const loadStatistics = useCallback(async () => {
    setLoadingStatistics(true);
    try {
      const params = new URLSearchParams({ period });
      if (dateRange.start_date) params.set('start_date', dateRange.start_date);
      if (dateRange.end_date) params.set('end_date', dateRange.end_date);
      const response = await apiCall(`/api/v1/admin/financial/statistics?${params}`, 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.detail || 'Unable to load financial statistics');
      setStatistics(payload?.data || null);
    } catch (error) {
      handleApiError(error, 'Unable to load financial statistics');
    } finally {
      setLoadingStatistics(false);
    }
  }, [period, dateRange]);

  useEffect(() => {
    if (activeView === 'statistics') loadStatistics();
  }, [activeView, loadStatistics]);

  const loadReferenceOptions = useCallback(async () => {
    if (referencesLoaded || loadingReferences) return;
    setLoadingReferences(true);
    try {
      const endpoints = [
        '/api/v1/admin/bookings?page=1&page_size=100',
        '/api/v1/admin/customers?page=1&page_size=100',
        '/api/v1/admin/vendors?page=1&page_size=100',
      ];
      const responses = await Promise.all(endpoints.map(endpoint => apiCall(endpoint, 'GET')));
      const payloads = await Promise.all(responses.map(response => response.json().catch(() => ({}))));
      const failedIndex = responses.findIndex((response, index) => !response.ok || payloads[index]?.success === false);
      if (failedIndex >= 0) {
        throw new Error(payloads[failedIndex]?.message || payloads[failedIndex]?.detail || 'Unable to load reference options');
      }

      const [bookings, customers, vendors] = payloads.map(getRows);
      setBookingOptions(bookings.map(booking => ({
        value: booking.id,
        label: [booking.booking_code || booking.code || booking.id, booking.customer_name || booking.customer?.name, booking.travel_date ? formatDate(booking.travel_date) : null].filter(Boolean).join(' · '),
        raw: booking,
      })).filter(option => option.value));
      setCustomerOptions(customers.map(customer => ({
        value: customer.id,
        label: [customer.name || customer.full_name || customer.customer_name || 'Customer', customer.email || customer.mobile].filter(Boolean).join(' · '),
      })).filter(option => option.value));
      setVendorOptions(vendors.map(vendor => ({
        value: vendor.id,
        label: [vendor.company_name || vendor.name || vendor.vendor_name || 'Vendor', vendor.vendor_code || vendor.code, vendor.email].filter(Boolean).join(' · '),
      })).filter(option => option.value));
      setReferencesLoaded(true);
    } catch (error) {
      handleApiError(error, 'Unable to load booking, customer, and vendor options');
    } finally {
      setLoadingReferences(false);
    }
  }, [referencesLoaded, loadingReferences]);

  const openCreateTransaction = () => {
    setEditingTransaction(null);
    setTransactionForm({ ...emptyTransaction, transaction_date: today });
    loadReferenceOptions();
    setIsTransactionModalOpen(true);
  };

  const openEditTransaction = transaction => {
    setEditingTransaction(transaction);
    setTransactionForm({
      transaction_type: transaction.transaction_type || 'INCOME',
      category: transaction.category || '',
      amount: transaction.amount ?? '',
      description: transaction.description || '',
      transaction_date: String(transaction.transaction_date || transaction.date || today).slice(0, 10),
      payment_method: transaction.payment_method || '',
      booking_id: transaction.booking_id || '',
      customer_id: transaction.customer_id || '',
      vendor_id: transaction.vendor_id || '',
      status: transaction.status || '',
    });
    loadReferenceOptions();
    setIsTransactionModalOpen(true);
  };

  const saveTransaction = async event => {
    event.preventDefault();
    setSavingTransaction(true);
    const body = {
      transaction_type: transactionForm.transaction_type,
      category: transactionForm.category.trim(),
      amount: Number(transactionForm.amount),
      description: transactionForm.description.trim(),
      transaction_date: transactionForm.transaction_date,
      payment_method: transactionForm.payment_method.trim() || null,
      booking_id: transactionForm.booking_id.trim() || null,
      customer_id: transactionForm.customer_id.trim() || null,
      vendor_id: transactionForm.vendor_id.trim() || null,
    };
    if (editingTransaction && transactionForm.status) body.status = transactionForm.status;
    try {
      const endpoint = editingTransaction
        ? `/api/v1/admin/financial/transactions/${editingTransaction.id}`
        : '/api/v1/admin/financial/transactions';
      const response = await apiCall(endpoint, editingTransaction ? 'PUT' : 'POST', body);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.detail || `Unable to ${editingTransaction ? 'update' : 'create'} transaction`);
      toast.success(payload?.message || `Transaction ${editingTransaction ? 'updated' : 'created'} successfully`);
      setIsTransactionModalOpen(false);
      await loadTransactions(currentPage, pageSize);
    } catch (error) {
      handleApiError(error, `Unable to ${editingTransaction ? 'update' : 'create'} transaction`);
    } finally {
      setSavingTransaction(false);
    }
  };

  const removeTransaction = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      const response = await apiCall(`/api/v1/admin/financial/transactions/${deleteTarget.id}`, 'DELETE');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.detail || 'Unable to delete transaction');
      toast.success(payload?.message || 'Transaction deleted');
      setDeleteTarget(null);
      await loadTransactions(currentPage, pageSize);
    } catch (error) {
      handleApiError(error, 'Unable to delete transaction');
    } finally {
      setDeleting(false);
    }
  };

  const generateReport = async event => {
    event.preventDefault();
    setLoadingReport(true);
    try {
      const params = new URLSearchParams({ report_type: reportType });
      if (dateRange.start_date) params.set('start_date', dateRange.start_date);
      if (dateRange.end_date) params.set('end_date', dateRange.end_date);
      const response = await apiCall(`/api/v1/admin/financial/reports?${params}`, 'GET');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.detail || 'Unable to generate report');
      setReport(payload?.data || null);
    } catch (error) {
      handleApiError(error, 'Unable to generate financial report');
    } finally {
      setLoadingReport(false);
    }
  };

  const downloadReport = async format => {
    setDownloadingFormat(format);
    try {
      const response = await apiCall('/api/v1/admin/financial/download', 'POST', {
        report_type: reportType,
        format,
        period,
        start_date: dateRange.start_date || null,
        end_date: dateRange.end_date || null,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || payload?.detail || 'Unable to download report');
      }
      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') || '';
      const filename = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1] || `financial_${reportType}.${format === 'excel' ? 'csv' : format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (error) {
      handleApiError(error, 'Unable to download report');
    } finally {
      setDownloadingFormat('');
    }
  };

  const reportRows = useMemo(() => {
    if (Array.isArray(report?.rows)) return report.rows;
    if (Array.isArray(report?.items)) return report.items;
    return [];
  }, [report]);
  const reportColumns = useMemo(() => {
    const keys = new Set();
    reportRows.forEach(row => Object.keys(row || {}).forEach(key => keys.add(key)));
    return Array.from(keys);
  }, [reportRows]);

  const applyFilters = event => {
    event.preventDefault();
    if (filterDraft.start_date && filterDraft.end_date && filterDraft.start_date > filterDraft.end_date) {
      toast.error('Start date must be before end date');
      return;
    }
    setCurrentPage(1);
    setFilters(filterDraft);
    setIsFilterModalOpen(false);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const metrics = statistics ? [
    { key: 'total_income', label: 'Total income', icon: ArrowDownLeft, color: 'emerald' },
    { key: 'total_expenses', label: 'Total expenses', icon: ArrowUpRight, color: 'rose' },
    { key: 'referral_income', label: 'Referral income', icon: Landmark, color: 'blue' },
    { key: 'net_profit_loss', label: 'Net profit / loss', icon: Wallet, color: Number(statistics.net_profit_loss) < 0 ? 'rose' : 'cyan' },
  ] : [];
  const metricColors = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    cyan: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  };

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-col gap-3 px-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Financial management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track transactions, review performance, and export financial reports.</p>
        </div>
        <div className="flex gap-2">
          {activeView === 'transactions' && <button type="button" onClick={() => loadTransactions(currentPage, pageSize)} aria-label="Refresh transactions" title="Refresh transactions" className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"><RefreshCw className={`h-4 w-4 ${loadingTransactions ? 'animate-spin' : ''}`} /></button>}
          {activeView === 'transactions' && <button type="button" onClick={() => { setFilterDraft(filters); loadReferenceOptions(); setIsFilterModalOpen(true); }} aria-label="Filter transactions" title="Filter transactions" aria-haspopup="dialog" aria-expanded={isFilterModalOpen} className="relative rounded-xl border border-gray-200 bg-white p-2.5 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"><Filter className="h-4 w-4" />{activeFilterCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-600 px-1 text-[10px] font-bold text-white">{activeFilterCount}</span>}</button>}
          {activeView === 'transactions' && <button type="button" onClick={openCreateTransaction} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"><Plus className="h-4 w-4" />New transaction</button>}
          {activeView === 'statistics' && <button type="button" onClick={loadStatistics} aria-label="Refresh statistics" title="Refresh statistics" className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"><RefreshCw className={`h-4 w-4 ${loadingStatistics ? 'animate-spin' : ''}`} /></button>}
        </div>
      </header>

      <nav aria-label="Financial views" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
        {views.map(view => {
          const Icon = view.icon;
          return <button key={view.id} type="button" onClick={() => setActiveView(view.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${activeView === view.id ? 'bg-cyan-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}><Icon className="h-4 w-4" />{view.label}</button>;
        })}
      </nav>

      {activeView === 'transactions' && (
        <>
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {loadingTransactions ? <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-gray-500"><RefreshCw className="h-4 w-4 animate-spin" />Loading transactions...</div> : transactions.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center gap-2 text-center"><Wallet className="h-9 w-9 text-gray-300" /><p className="text-sm font-semibold text-gray-700 dark:text-gray-200">No transactions found</p><p className="text-xs text-gray-500">Adjust filters or add a financial transaction.</p></div> : <div className="overflow-x-auto"><ManagementTable><table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/70 dark:text-gray-400"><tr><th className="px-4 py-3">Transaction</th><th className="px-4 py-3">Type / Category</th><th className="px-4 py-3">Related record</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{transactions.map((transaction, index) => <tr key={transaction.id || index} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40"><td className="max-w-xs px-4 py-3"><p className="truncate font-semibold text-gray-900 dark:text-white">{transaction.description || transaction.reference_number || `Transaction ${index + 1}`}</p><p className="mt-0.5 truncate font-mono text-[10px] text-gray-400" title={transaction.id}>{transaction.transaction_code || transaction.id || '—'}</p></td><td className="px-4 py-3"><p className="font-medium text-gray-800 dark:text-gray-200">{prettyLabel(transaction.transaction_type || 'Transaction')}</p><p className="text-xs text-gray-500">{prettyLabel(transaction.category || 'Uncategorized')}</p></td><td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{transaction.booking_code || transaction.booking_id || transaction.vendor_name || transaction.customer_name || '—'}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{formatDate(transaction.transaction_date || transaction.created_at)}</td><td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900 dark:text-white">{formatAmount(transaction.amount, transaction.currency)}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(transaction.status)}`}>{prettyLabel(transaction.status || 'Unknown')}</span></td><td className="px-4 py-3 text-right"><ActionMenu menuId={`financial-${transaction.id || index}`} actions={[{ label: 'Edit transaction', icon: <Pencil className="h-4 w-4 text-blue-600" />, onClick: () => openEditTransaction(transaction) }, { label: 'Delete transaction', icon: <Trash2 className="h-4 w-4 text-rose-600" />, onClick: () => setDeleteTarget(transaction), className: 'text-rose-600 dark:text-rose-400' }]} /></td></tr>)}</tbody>
            </table></ManagementTable></div>}
            {totalItems > 0 && <div className="border-t border-gray-100 px-3 py-3 dark:border-gray-800"><Pagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={pageSize} onPageChange={setCurrentPage} onLimitChange={limit => { setPageSize(limit); setCurrentPage(1); }} /></div>}
          </section>
        </>
      )}

      {activeView === 'statistics' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-end">
            <label className="min-w-40 flex-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Reporting period<SelectField options={periodOptions} value={periodOptions.find(option => option.value === period) || null} onChange={option => setPeriod(option?.value || 'monthly')} isSearchable={false} className="mt-1" menuPlacement="auto" classNamePrefix="react-select" /></label>
            <label className="flex-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Start date<input type="date" value={dateRange.start_date} onChange={event => setDateRange({ ...dateRange, start_date: event.target.value })} className={`${inputClass} mt-1`} /></label>
            <label className="flex-1 text-xs font-semibold text-gray-600 dark:text-gray-300">End date<input type="date" value={dateRange.end_date} onChange={event => setDateRange({ ...dateRange, end_date: event.target.value })} className={`${inputClass} mt-1`} /></label>
            <button type="button" onClick={loadStatistics} disabled={loadingStatistics} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><CalendarDays className="h-4 w-4" />Update</button>
          </div>
          {loadingStatistics ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-gray-500"><RefreshCw className="h-4 w-4 animate-spin" />Loading statistics...</div> : statistics ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(metric => { const Icon = metric.icon; return <article key={metric.key} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">{metric.label}</p><span className={`rounded-xl p-2 ${metricColors[metric.color]}`}><Icon className="h-4 w-4" /></span></div><p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{formatAmount(statistics[metric.key])}</p><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{statistics.start_date || 'Period start not specified'}{statistics.end_date ? ` to ${statistics.end_date}` : ''}</p></article>; })}</div> : <div className="p-12 text-center text-sm text-gray-500">No statistics available.</div>}
        </section>
      )}

      {activeView === 'reports' && (
        <section className="space-y-4">
          <form onSubmit={generateReport} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Report type<SelectField options={reportTypeOptions} value={reportTypeOptions.find(option => option.value === reportType) || null} onChange={option => setReportType(option?.value || 'income')} isSearchable={false} className="mt-1" menuPlacement="auto" classNamePrefix="react-select" /></label>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Start date<input type="date" value={dateRange.start_date} onChange={event => setDateRange({ ...dateRange, start_date: event.target.value })} className={`${inputClass} mt-1`} /></label>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">End date<input type="date" value={dateRange.end_date} onChange={event => setDateRange({ ...dateRange, end_date: event.target.value })} className={`${inputClass} mt-1`} /></label>
            <button type="submit" disabled={loadingReport} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><ChartNoAxesCombined className="h-4 w-4" />{loadingReport ? 'Generating...' : 'Generate report'}</button>
            <div className="flex gap-2">{['csv', 'excel', 'pdf'].map(format => <button key={format} type="button" disabled={Boolean(downloadingFormat)} onClick={() => downloadReport(format)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold capitalize text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"><Download className="h-4 w-4" />{downloadingFormat === format ? '...' : format}</button>)}</div>
          </form>
          {!report && !loadingReport ? <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 text-center dark:border-gray-700"><FileText className="h-8 w-8 text-gray-300" /><p className="text-sm text-gray-500">Choose a report and generate it to review the results.</p></div> : null}
          {loadingReport && <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-gray-500"><RefreshCw className="h-4 w-4 animate-spin" />Generating report...</div>}
          {report && !loadingReport && <div className="space-y-4">
            {Object.entries(report).filter(([key, value]) => key !== 'rows' && key !== 'items' && key !== 'period' && key !== 'start_date' && key !== 'end_date' && (typeof value !== 'object' || value === null)).length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(report).filter(([key, value]) => key !== 'rows' && key !== 'items' && key !== 'period' && key !== 'start_date' && key !== 'end_date' && (typeof value !== 'object' || value === null)).map(([key, value]) => <div key={key} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><p className="text-xs text-gray-500">{prettyLabel(key)}</p><p className="mt-2 break-words text-lg font-bold text-gray-900 dark:text-white">{key.includes('amount') || key.includes('income') || key.includes('expense') || key.includes('total') ? formatAmount(value) : String(value ?? '—')}</p></div>)}</div>}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"><div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800"><h2 className="font-semibold text-gray-900 dark:text-white">Report details</h2><p className="text-xs text-gray-500">{reportRows.length} rows</p></div>{reportRows.length && reportColumns.length ? <div className="overflow-x-auto"><ManagementTable><table className="min-w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/70 dark:text-gray-400"><tr>{reportColumns.map(column => <th key={column} className="whitespace-nowrap px-4 py-3">{prettyLabel(column)}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{reportRows.map((row, index) => <tr key={row.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">{reportColumns.map(column => <td key={column} className="max-w-sm px-4 py-3 text-gray-700 dark:text-gray-200">{row[column] == null ? '—' : typeof row[column] === 'object' ? JSON.stringify(row[column]) : String(row[column])}</td>)}</tr>)}</tbody></table></ManagementTable></div> : <div className="p-10 text-center text-sm text-gray-500">No report rows for this period.</div>}</div>
          </div>}
        </section>
      )}

      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => { setFilterDraft(filters); setIsFilterModalOpen(false); }}
        title="Filter transactions"
        icon={Filter}
        size="lg"
        footer={<div className="flex w-full flex-col-reverse justify-between gap-3 sm:flex-row"><button type="button" onClick={() => { setFilterDraft(emptyFilters); setFilters(emptyFilters); setCurrentPage(1); setIsFilterModalOpen(false); }} className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Clear filters</button><div className="flex justify-end gap-2"><button type="button" onClick={() => { setFilterDraft(filters); setIsFilterModalOpen(false); }} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Cancel</button><button type="submit" form="financial-filter-form" className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">Apply filters</button></div></div>}
      >
        <form id="financial-filter-form" onSubmit={applyFilters} className="grid gap-4 p-1 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">Search<div className="relative mt-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input autoFocus value={filterDraft.search} onChange={event => setFilterDraft({ ...filterDraft, search: event.target.value })} className={`${inputClass} pl-9`} placeholder="Search transactions" /></div></label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Transaction type<SelectField options={transactionTypeOptions} value={transactionTypeOptions.find(option => option.value === filterDraft.transaction_type) || transactionTypeOptions[0]} onChange={option => setFilterDraft({ ...filterDraft, transaction_type: option?.value || '' })} isSearchable={false} className="mt-1" menuPlacement="auto" classNamePrefix="react-select" /></label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status<SelectField options={transactionStatusOptions} value={transactionStatusOptions.find(option => option.value === filterDraft.status) || transactionStatusOptions[0]} onChange={option => setFilterDraft({ ...filterDraft, status: option?.value || '' })} isSearchable={false} className="mt-1" menuPlacement="auto" classNamePrefix="react-select" /></label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category<input value={filterDraft.category} onChange={event => setFilterDraft({ ...filterDraft, category: event.target.value })} className={`${inputClass} mt-1`} placeholder="Category" /></label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Booking<SelectField options={bookingOptions} value={bookingOptions.find(option => option.value === filterDraft.booking_id) || (filterDraft.booking_id ? { value: filterDraft.booking_id, label: filterDraft.booking_id } : null)} onChange={option => setFilterDraft({ ...filterDraft, booking_id: option?.value || '' })} isSearchable isClearable isLoading={loadingReferences} className="mt-1" placeholder="Search bookings..." noOptionsMessage={() => loadingReferences ? 'Loading bookings...' : 'No bookings found'} menuPlacement="auto" classNamePrefix="react-select" /></label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer<SelectField options={customerOptions} value={customerOptions.find(option => option.value === filterDraft.customer_id) || (filterDraft.customer_id ? { value: filterDraft.customer_id, label: filterDraft.customer_id } : null)} onChange={option => setFilterDraft({ ...filterDraft, customer_id: option?.value || '' })} isSearchable isClearable isLoading={loadingReferences} className="mt-1" placeholder="Search customers..." noOptionsMessage={() => loadingReferences ? 'Loading customers...' : 'No customers found'} menuPlacement="auto" classNamePrefix="react-select" /></label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vendor<SelectField options={vendorOptions} value={vendorOptions.find(option => option.value === filterDraft.vendor_id) || (filterDraft.vendor_id ? { value: filterDraft.vendor_id, label: filterDraft.vendor_id } : null)} onChange={option => setFilterDraft({ ...filterDraft, vendor_id: option?.value || '' })} isSearchable isClearable isLoading={loadingReferences} className="mt-1" placeholder="Search vendors..." noOptionsMessage={() => loadingReferences ? 'Loading vendors...' : 'No vendors found'} menuPlacement="auto" classNamePrefix="react-select" /></label>
          <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start date<CustomDatePicker value={filterDraft.start_date} onChange={value => setFilterDraft({ ...filterDraft, start_date: value })} includeTime={false} placeholder="Choose start date" /></label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End date<CustomDatePicker value={filterDraft.end_date} onChange={value => setFilterDraft({ ...filterDraft, end_date: value })} includeTime={false} placeholder="Choose end date" /></label>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isTransactionModalOpen} onClose={() => !savingTransaction && setIsTransactionModalOpen(false)} title={editingTransaction ? 'Edit transaction' : 'New transaction'} icon={Wallet} size="lg" footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setIsTransactionModalOpen(false)} disabled={savingTransaction} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Cancel</button><button type="submit" form="financial-transaction-form" disabled={savingTransaction} className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{savingTransaction ? 'Saving...' : editingTransaction ? 'Save changes' : 'Create transaction'}</button></div>}>
        <form id="financial-transaction-form" onSubmit={saveTransaction} className="grid gap-4 p-1 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Transaction type<SelectField options={transactionDirectionOptions} value={transactionDirectionOptions.find(option => option.value === transactionForm.transaction_type) || transactionDirectionOptions[0]} onChange={option => setTransactionForm({ ...transactionForm, transaction_type: option?.value || 'INCOME' })} isSearchable={false} className="mt-1" menuPlacement="auto" classNamePrefix="react-select" /></label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category<input required value={transactionForm.category} onChange={event => setTransactionForm({ ...transactionForm, category: event.target.value })} className={`${inputClass} mt-1`} placeholder="e.g. booking, refund, vendor payment" /></label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount<input required type="number" min="0.01" step="0.01" value={transactionForm.amount} onChange={event => setTransactionForm({ ...transactionForm, amount: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Transaction date<input required type="date" value={transactionForm.transaction_date} onChange={event => setTransactionForm({ ...transactionForm, transaction_date: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment method<input value={transactionForm.payment_method} onChange={event => setTransactionForm({ ...transactionForm, payment_method: event.target.value })} className={`${inputClass} mt-1`} placeholder="Optional" /></label>
          {editingTransaction && <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status<input value={transactionForm.status || ''} onChange={event => setTransactionForm({ ...transactionForm, status: event.target.value })} className={`${inputClass} mt-1`} placeholder="Transaction status" /></label>}
          <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Booking</label><SelectField options={bookingOptions} value={bookingOptions.find(option => option.value === transactionForm.booking_id) || (transactionForm.booking_id ? { value: transactionForm.booking_id, label: editingTransaction?.booking_code || transactionForm.booking_id } : null)} onChange={option => setTransactionForm(current => ({ ...current, booking_id: option?.value || '', customer_id: option?.raw?.customer_id || option?.raw?.customer?.id || current.customer_id }))} isSearchable isClearable isLoading={loadingReferences} placeholder="Search bookings..." noOptionsMessage={() => loadingReferences ? 'Loading bookings...' : 'No bookings found'} menuPlacement="auto" classNamePrefix="react-select" /></div>
          <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label><SelectField options={customerOptions} value={customerOptions.find(option => option.value === transactionForm.customer_id) || (transactionForm.customer_id ? { value: transactionForm.customer_id, label: transactionForm.customer_id } : null)} onChange={option => setTransactionForm(current => ({ ...current, customer_id: option?.value || '' }))} isSearchable isClearable isLoading={loadingReferences} placeholder="Search customers..." noOptionsMessage={() => loadingReferences ? 'Loading customers...' : 'No customers found'} menuPlacement="auto" classNamePrefix="react-select" /></div>
          <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vendor</label><SelectField options={vendorOptions} value={vendorOptions.find(option => option.value === transactionForm.vendor_id) || (transactionForm.vendor_id ? { value: transactionForm.vendor_id, label: editingTransaction?.vendor_name || transactionForm.vendor_id } : null)} onChange={option => setTransactionForm(current => ({ ...current, vendor_id: option?.value || '' }))} isSearchable isClearable isLoading={loadingReferences} placeholder="Search vendors..." noOptionsMessage={() => loadingReferences ? 'Loading vendors...' : 'No vendors found'} menuPlacement="auto" classNamePrefix="react-select" /></div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">Description<textarea required rows={3} value={transactionForm.description} onChange={event => setTransactionForm({ ...transactionForm, description: event.target.value })} className={`${inputClass} mt-1`} /></label>
        </form>
      </Modal>
      <ConfirmDeleteModal isOpen={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} onConfirm={removeTransaction} confirming={deleting} itemLabel={deleteTarget?.description || deleteTarget?.transaction_code || 'this transaction'} title="Delete transaction" message="This transaction and its associated ledger entries will be permanently deleted when permitted." />
    </div>
  );
};

export default FinancialManagement;
