import { useState, useEffect, useCallback } from 'react';
import {
  IconBuildingStore,
  IconPlus,
  IconTrash,
  IconPencil,
  IconCheck,
  IconX,
  IconSearch,
  IconAlertCircle,
  IconPhone,
  IconMapPin,
  IconWorld,
  IconLoader2,
  IconArrowRight,
  IconCircleCheck,
  IconMail,
  IconTag,
  IconFolders
} from '@tabler/icons-react';
import { adminSupabase } from '../../lib/supabase';

const SEARCH_WEBHOOK = `/api/n8n/webhook/${import.meta.env.VITE_N8N_WEBHOOK_VENDOR_SEARCH}`;
const TABLE = 'contact_vendors';
const emptyForm = () => ({
  company_name: '',
  Type: '',
  city: 'Dubai',
  country: 'United Arab Emirates',
  phone: '',
  email: '',
  website: '',
  contact_person: '',
});

const normalizePlaces = (json) => {
  const arr = Array.isArray(json) ? json : [json];
  const raw = arr[0]?.places ? arr[0].places : arr;
  return (Array.isArray(raw) ? raw : []).map(p => ({
    id: p.id,
    name: p.displayName?.text || p.displayName || p.name || 'Unknown',
    phone: p.internationalPhoneNumber || p.phone || '',
    address: p.formattedAddress || p.address || '',
    website: p.websiteUri || p.website || '',
    languageCode: p.displayName?.languageCode || 'en',
  }));
};

const parseLocation = (address) => {
  const parts = (address || '').split(' - ').map(p => p.trim()).filter(Boolean);
  let city = parts.length >= 2 ? parts[parts.length - 2] : 'Dubai';
  let country = parts.length >= 1 ? parts[parts.length - 1] : 'United Arab Emirates';
  if (country.toLowerCase() === 'uae') country = 'United Arab Emirates';
  return { city, country };
};

const TypeBadge = ({ type }) => (
  <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border border-[#F59E0B]/30 inline-flex items-center gap-1">
    <IconTag size={11} />
    {type || 'Uncategorized'}
  </span>
);

const StatusDot = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${
    status ? 'text-green-400' : 'text-[rgba(255,255,255,0.25)]'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${status ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-[rgba(255,255,255,0.15)]'}`} />
    {status || 'No status'}
  </span>
);

const ContactVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptyForm());
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');

  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedTerm, setSearchedTerm] = useState('');
  const [searchError, setSearchError] = useState('');

  const loadVendors = useCallback(async () => {
    const { data, error } = await adminSupabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }, []);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setVendors(await loadVendors());
      setError('');
    } catch (err) {
      console.error('Contact vendors fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [loadVendors]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await loadVendors();
        if (!active) return;
        setVendors(rows);
        setError('');
      } catch (err) {
        if (!active) return;
        console.error('Contact vendors fetch error:', err);
        setError(err.message);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loadVendors]);

  const types = [...new Set(vendors.map(v => v.Type).filter(Boolean))].sort();
  const filtered = typeFilter === 'All'
    ? vendors
    : vendors.filter(v => v.Type === typeFilter);
  const groups = filtered.reduce((acc, v) => {
    const key = v.Type || 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  const handleSearch = async (e) => {
    e.preventDefault();
    const query = search.trim();
    if (!query || isSearching) return;
    setIsSearching(true);
    setSearchError('');
    setSearchedTerm(query);
    try {
      const res = await fetch(`${SEARCH_WEBHOOK}?query=${encodeURIComponent(query)}`, {
        method: 'GET',
      });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const json = await res.json();
      setResults(normalizePlaces(json));
    } catch (err) {
      console.error('Vendor search error:', err);
      setSearchError(err.message);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addFromResult = (p) => {
    const { city, country } = parseLocation(p.address);
    setForm({
      company_name: p.name,
      Type: '',
      city,
      country,
      phone: p.phone,
      email: '',
      website: p.website,
      contact_person: '',
    });
    setResults([]);
    setSearchedTerm('');
    setIsAdding(true);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) return;
    setIsLoading(true);
    try {
      const { error } = await adminSupabase.from(TABLE).insert({
        company_name: form.company_name.trim(),
        Type: form.Type.trim() || null,
        city: form.city.trim() || 'Dubai',
        country: form.country.trim() || 'United Arab Emirates',
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        contact_person: form.contact_person.trim() || null,
      });
      if (error) throw new Error(error.message);
      setForm(emptyForm());
      setIsAdding(false);
      setError('');
      await reload();
    } catch (err) {
      console.error('Add vendor error:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const startEdit = (v) => {
    setEditingId(v.id);
    setEditing({
      company_name: v.company_name || '',
      Type: v.Type || '',
      city: v.city || 'Dubai',
      country: v.country || 'United Arab Emirates',
      phone: v.phone || '',
      email: v.email || '',
      website: v.website || '',
      contact_person: v.contact_person || '',
    });
  };

  const saveEdit = async (v) => {
    if (!editing.company_name.trim()) return;
    try {
      const { error } = await adminSupabase
        .from(TABLE)
        .update({
          company_name: editing.company_name.trim(),
          Type: editing.Type.trim() || null,
          city: editing.city.trim() || 'Dubai',
          country: editing.country.trim() || 'United Arab Emirates',
          phone: editing.phone.trim() || null,
          email: editing.email.trim() || null,
          website: editing.website.trim() || null,
          contact_person: editing.contact_person.trim() || null,
        })
        .eq('id', v.id);
      if (error) throw new Error(error.message);
      setEditingId(null);
      setError('');
      await reload();
    } catch (err) {
      console.error('Update vendor error:', err);
      setError(err.message);
    }
  };

  const deleteVendor = async (v) => {
    if (!window.confirm(`Are you sure you want to remove ${v.company_name}?`)) return;
    try {
      const { error } = await adminSupabase.from(TABLE).delete().eq('id', v.id);
      if (error) throw new Error(error.message);
      setError('');
      await reload();
    } catch (err) {
      console.error('Delete vendor error:', err);
      setError(err.message);
    }
  };

  const inputCls = "w-full bg-[rgba(255,255,255,0.05)] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:border-[#F59E0B] outline-none transition-all placeholder:text-[rgba(255,255,255,0.25)]";

  return (
    <div className="w-full text-white bg-[#06090F] min-h-screen px-3 sm:px-6 md:px-8 py-4 sm:py-6">
      <div className="mb-6 sm:mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 sm:gap-3">
              <IconBuildingStore className="text-[#F59E0B]" size={24} />
              Contact Vendors
            </h2>
            <p className="text-[rgba(255,255,255,0.4)] text-[10px] sm:text-sm font-medium mt-1">
              Search the UAE market for suppliers, then save them to your vendor directory.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold rounded-lg transition-all active:scale-95"
          >
            <IconPlus size={18} />
            {isAdding ? 'Cancel' : 'Add Vendor'}
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <IconSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers, e.g. 'steel suppliers in Dubai'..."
              className="w-full bg-[#1a1f2e] border border-[rgba(255,255,255,0.1)] rounded-xl pl-11 pr-4 py-3 text-sm text-white/90 outline-none focus:border-[#F59E0B] focus:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all placeholder:text-white/25"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !search.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all active:scale-95"
          >
            {isSearching ? <IconLoader2 size={16} className="animate-spin" /> : <IconSearch size={16} />}
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <IconAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {searchError && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <IconAlertCircle size={18} />
          <span>Search failed: {searchError}</span>
        </div>
      )}

      {/* Search Results */}
      <div className="mb-8">
        {isSearching ? (
          <div className="glass-panel p-10 flex flex-col items-center justify-center gap-4 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] rounded-xl">
            <div className="w-12 h-12 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-white">
              Searching suppliers for <span className="text-[#F59E0B]">"{searchedTerm}"</span>...
            </p>
            <p className="text-[11px] text-white/30 font-medium">Querying the UAE market directory</p>
          </div>
        ) : searchedTerm && results.length === 0 ? (
          <div className="glass-panel p-10 flex flex-col items-center justify-center gap-3 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] rounded-xl text-center">
            <IconSearch size={28} className="text-white/20" />
            <p className="text-sm font-bold text-white/60">No suppliers found for <span className="text-[#F59E0B]">"{searchedTerm}"</span></p>
            <p className="text-[11px] text-white/30">Try a different search term.</p>
          </div>
        ) : results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <IconSearch size={16} className="text-[#F59E0B]" />
                Search Results <span className="text-white/25 normal-case">for "{searchedTerm}"</span>
              </h3>
              <span className="text-[11px] font-black text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border border-[#F59E0B]/20 rounded-full px-3 py-1">
                {results.length} found
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.map((p) => (
                <div key={p.id || p.name} className="glass-panel p-5 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] hover:border-[#F59E0B]/30 hover:-translate-y-0.5 transition-all duration-300 flex flex-col group">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(245,158,11,0.12)] border border-[#F59E0B]/25 flex items-center justify-center text-[#F59E0B] font-black text-sm shrink-0">
                      {(p.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <button
                      onClick={() => addFromResult(p)}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#F59E0B] hover:text-black text-white/60 border border-white/10 hover:border-[#F59E0B] transition-all active:scale-95"
                    >
                      <IconPlus size={13} />
                      Add
                    </button>
                  </div>
                  <h3 className="text-[13px] font-bold text-white leading-snug group-hover:text-[#F59E0B] transition-colors">
                    {p.name}
                  </h3>
                  <div className="mt-3 space-y-2 flex-1">
                    {p.phone && (
                      <a href={`tel:${p.phone}`} className="flex items-center gap-2 text-[11px] text-white/50 hover:text-[#F59E0B] transition-colors">
                        <IconPhone size={13} className="shrink-0" />
                        <span className="truncate">{p.phone}</span>
                      </a>
                    )}
                    {p.address && (
                      <p className="flex items-start gap-2 text-[11px] text-white/40 leading-relaxed">
                        <IconMapPin size={13} className="shrink-0 mt-0.5" />
                        <span>{p.address}</span>
                      </p>
                    )}
                    {p.website && (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[11px] text-[#F59E0B] hover:underline transition-colors"
                      >
                        <IconWorld size={13} className="shrink-0" />
                        <span className="truncate">{p.website.replace(/^https?:\/\//, '')}</span>
                        <IconArrowRight size={12} className="shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="glass-panel p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-end gap-3 sm:gap-4 border border-[#F59E0B]/30 animate-in slide-in-from-top-4 duration-300 mb-8">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              Company Name
            </label>
            <input
              required
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className={inputCls}
              placeholder="e.g. Al Futtaim Trading"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              Type
            </label>
            <input
              value={form.Type}
              onChange={(e) => setForm({ ...form, Type: e.target.value })}
              className={inputCls}
              placeholder="e.g. Steel Supplier"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              City
            </label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className={inputCls}
              placeholder="Dubai"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              Country
            </label>
            <input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className={inputCls}
              placeholder="United Arab Emirates"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputCls}
              placeholder="+971 ..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              Email
            </label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputCls}
              placeholder="info@company.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              Website
            </label>
            <input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className={inputCls}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)] ml-1">
              Contact Person
            </label>
            <input
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              className={inputCls}
              placeholder="Full name"
            />
          </div>
          <button
            type="submit"
            className="w-full px-6 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-black font-black text-xs uppercase tracking-widest rounded-lg transition-all h-[44.5px] flex items-center justify-center gap-2 sm:col-span-2 lg:col-span-1"
          >
            <IconCircleCheck size={16} />
            Save Vendor
          </button>
        </form>
      )}

      {/* Vendor Directory — grouped by Type */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <IconFolders size={16} className="text-[#F59E0B]" />
          Vendor Directory <span className="text-white/25 normal-case">({vendors.length})</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTypeFilter('All')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              typeFilter === 'All'
                ? 'bg-[#F59E0B] text-black'
                : 'bg-white/5 text-white/40 hover:text-white/70 border border-white/10'
            }`}
          >
            All
          </button>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                typeFilter === t
                  ? 'bg-[#F59E0B] text-black'
                  : 'bg-white/5 text-white/40 hover:text-white/70 border border-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel p-12 flex flex-col items-center gap-3 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] rounded-xl">
          <div className="w-10 h-10 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-widest">Fetching vendors...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-12 flex flex-col items-center gap-3 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] rounded-xl text-center">
          <IconBuildingStore size={28} className="text-white/20" />
          <p className="text-sm font-bold text-white/50">No vendors found for this type</p>
          <p className="text-[11px] text-white/30">Search above to find and add suppliers.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([type, items]) => (
            <div key={type}>
              <div className="flex items-center justify-between mb-3">
                <TypeBadge type={type} />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{items.length} vendor{items.length > 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((v) => (
                  <div key={v.id} className="glass-panel p-5 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] hover:border-[#F59E0B]/30 hover:-translate-y-0.5 transition-all duration-300 flex flex-col group">
                    {editingId === v.id ? (
                      <div className="space-y-3">
                        {[
                          { key: 'company_name', label: 'Company Name', ph: 'Company name' },
                          { key: 'Type', label: 'Type', ph: 'e.g. Steel Supplier' },
                          { key: 'city', label: 'City', ph: 'Dubai' },
                          { key: 'country', label: 'Country', ph: 'United Arab Emirates' },
                          { key: 'phone', label: 'Phone', ph: '+971 ...' },
                          { key: 'email', label: 'Email', ph: 'info@company.com' },
                          { key: 'website', label: 'Website', ph: 'https://...' },
                          { key: 'contact_person', label: 'Contact Person', ph: 'Full name' },
                        ].map(f => (
                          <div key={f.key} className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.35)] ml-1">{f.label}</label>
                            <input
                              value={editing[f.key] || ''}
                              onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                              className={inputCls}
                              placeholder={f.ph}
                            />
                          </div>
                        ))}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => saveEdit(v)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all active:scale-95 text-[10px] font-black uppercase tracking-wider"
                          >
                            <IconCheck size={14} />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all active:scale-95 text-[10px] font-black uppercase tracking-wider"
                          >
                            <IconX size={14} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-[rgba(245,158,11,0.12)] border border-[#F59E0B]/25 flex items-center justify-center text-[#F59E0B] font-black text-sm shrink-0">
                            {(v.company_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => startEdit(v)}
                              className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all active:scale-90"
                              title="Edit"
                            >
                              <IconPencil size={15} />
                            </button>
                            <button
                              onClick={() => deleteVendor(v)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all active:scale-90"
                              title="Delete"
                            >
                              <IconTrash size={15} />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-[13px] font-bold text-white leading-snug group-hover:text-[#F59E0B] transition-colors">
                          {v.company_name || 'Unknown'}
                        </h3>
                        {v.contact_person && (
                          <p className="text-[11px] text-white/40 mt-0.5">{v.contact_person}</p>
                        )}
                        <div className="mt-3 space-y-2 flex-1">
                          {v.phone && (
                            <a href={`tel:${v.phone}`} className="flex items-center gap-2 text-[11px] text-white/50 hover:text-[#F59E0B] transition-colors">
                              <IconPhone size={13} className="shrink-0" />
                              <span className="truncate">{v.phone}</span>
                            </a>
                          )}
                          {v.email && (
                            <a href={`mailto:${v.email}`} className="flex items-center gap-2 text-[11px] text-white/50 hover:text-[#F59E0B] transition-colors">
                              <IconMail size={13} className="shrink-0" />
                              <span className="truncate">{v.email}</span>
                            </a>
                          )}
                          {(v.address || v.city || v.country) && (
                            <p className="flex items-start gap-2 text-[11px] text-white/40 leading-relaxed">
                              <IconMapPin size={13} className="shrink-0 mt-0.5" />
                              <span>{[v.address, v.city, v.country].filter(Boolean).join(', ')}</span>
                            </p>
                          )}
                          {v.website && (
                            <a
                              href={v.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-[11px] text-[#F59E0B] hover:underline transition-colors"
                            >
                              <IconWorld size={13} className="shrink-0" />
                              <span className="truncate">{v.website.replace(/^https?:\/\//, '')}</span>
                              <IconArrowRight size={12} className="shrink-0" />
                            </a>
                          )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                          <StatusDot status={v.lead_status} />
                          <span className="text-[10px] text-white/25 font-medium">{v.lead_source || '—'}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactVendors;
