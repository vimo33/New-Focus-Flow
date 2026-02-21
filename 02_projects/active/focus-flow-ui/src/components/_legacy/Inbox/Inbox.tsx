import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { InboxItem, InboxCounts, ProcessInboxRequest } from '../../services/api';
import { ProcessModal } from './ProcessModal';

type FilterType = 'all' | 'work' | 'personal' | 'ideas';

export function Inbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [counts, setCounts] = useState<InboxCounts>({ all: 0, work: 0, personal: 0, ideas: 0 });
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [processingItem, setProcessingItem] = useState<InboxItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Fetch inbox items and counts
  useEffect(() => {
    loadInboxData();
  }, [activeFilter]);

  const loadInboxData = async () => {
    try {
      setLoading(true);
      const filter = activeFilter === 'all' ? undefined : activeFilter;
      const [inboxData, countsData] = await Promise.all([
        api.getInbox(filter),
        api.getInboxCounts()
      ]);

      setItems(inboxData.items);
      setCounts(countsData);
    } catch (error) {
      console.error('Failed to load inbox data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setSelectedItems(new Set());
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleProcessItem = (item: InboxItem) => {
    setProcessingItem(item);
  };

  const handleProcessComplete = async (data: ProcessInboxRequest) => {
    if (!processingItem) return;

    try {
      await api.processInboxItem(processingItem.id, data);
      setProcessingItem(null);
      loadInboxData();

      // Remove from selected items if it was selected
      const newSelected = new Set(selectedItems);
      newSelected.delete(processingItem.id);
      setSelectedItems(newSelected);
    } catch (error) {
      console.error('Failed to process item:', error);
      alert('Failed to process item. Please try again.');
    }
  };

  const handleBatchAction = async (action: 'archive' | 'delete') => {
    if (selectedItems.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedItems).map(itemId =>
          api.processInboxItem(itemId, { action })
        )
      );

      setSelectedItems(new Set());
      loadInboxData();
    } catch (error) {
      console.error('Failed to perform batch action:', error);
      alert('Failed to perform batch action. Please try again.');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await api.processInboxItem(itemId, { action: 'delete' });
      loadInboxData();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const handleArchiveItem = async (itemId: string) => {
    try {
      await api.processInboxItem(itemId, { action: 'archive' });
      loadInboxData();
    } catch (error) {
      console.error('Failed to archive item:', error);
      alert('Failed to archive item. Please try again.');
    }
  };

  // Filter items by search query
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.text.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.ai_classification?.suggested_action.toLowerCase().includes(query)
    );
  });

  // Get category badge color
  const getCategoryBadge = (category?: string, aiCategory?: string) => {
    const cat = category || aiCategory;
    switch (cat) {
      case 'work':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'personal':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'ideas':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  // Get urgency label
  const getUrgencyLabel = (item: InboxItem) => {
    const priority = item.ai_classification?.suggested_action;
    if (priority === 'task') return 'Quick';
    if (priority === 'project') return 'Deep Work';
    return null;
  };

  const getUrgencyColor = (label: string | null) => {
    if (!label) return '';
    if (label === 'Quick') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const isOverdue = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days >= 1;
  };

  return (
    <div className="flex flex-col h-full bg-background-dark">
      {/* Header */}
      <header className="flex flex-col shrink-0 pt-8 pb-4 px-8 border-b border-[#233648]/50 z-10 bg-background-dark/95 backdrop-blur-sm">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div className="flex min-w-72 flex-col gap-1">
            <h2 className="text-white tracking-tight text-3xl font-bold leading-tight">
              Inbox Processing Center
            </h2>
            <p className="text-[#92adc9] text-sm font-normal leading-normal flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Process your tasks to achieve flow.
            </p>
          </div>
          <button
            className="flex items-center gap-2 cursor-pointer justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#233648] hover:bg-[#324d67] text-white text-sm font-medium transition-all shadow-lg border border-[#324d67]"
            data-testid="add-item-button"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="truncate">Add Item</span>
          </button>
        </div>

        {/* Tabs and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-8">
            <button
              onClick={() => handleFilterChange('all')}
              className={`flex items-center justify-center border-b-2 pb-3 px-1 ${
                activeFilter === 'all'
                  ? 'border-primary text-white'
                  : 'border-transparent text-[#92adc9] hover:text-white hover:border-[#233648]'
              } transition-all`}
              data-testid="filter-all"
            >
              <span className="text-sm font-bold leading-normal tracking-wide">
                All{' '}
                <span className={`text-xs bg-[#233648] px-2 py-0.5 rounded-full ml-1 ${
                  activeFilter === 'all' ? 'text-primary' : ''
                }`}>
                  {counts.all}
                </span>
              </span>
            </button>

            <button
              onClick={() => handleFilterChange('work')}
              className={`flex items-center justify-center border-b-2 pb-3 px-1 ${
                activeFilter === 'work'
                  ? 'border-primary text-white'
                  : 'border-transparent text-[#92adc9] hover:text-white hover:border-[#233648]'
              } transition-all`}
              data-testid="filter-work"
            >
              <span className="text-sm font-medium leading-normal tracking-wide">
                Work{' '}
                <span className={`text-xs bg-[#233648] px-2 py-0.5 rounded-full ml-1 ${
                  activeFilter === 'work' ? 'text-primary' : ''
                }`}>
                  {counts.work}
                </span>
              </span>
            </button>

            <button
              onClick={() => handleFilterChange('personal')}
              className={`flex items-center justify-center border-b-2 pb-3 px-1 ${
                activeFilter === 'personal'
                  ? 'border-primary text-white'
                  : 'border-transparent text-[#92adc9] hover:text-white hover:border-[#233648]'
              } transition-all`}
              data-testid="filter-personal"
            >
              <span className="text-sm font-medium leading-normal tracking-wide">
                Personal{' '}
                <span className={`text-xs bg-[#233648] px-2 py-0.5 rounded-full ml-1 ${
                  activeFilter === 'personal' ? 'text-primary' : ''
                }`}>
                  {counts.personal}
                </span>
              </span>
            </button>

            <button
              onClick={() => handleFilterChange('ideas')}
              className={`flex items-center justify-center border-b-2 pb-3 px-1 ${
                activeFilter === 'ideas'
                  ? 'border-primary text-white'
                  : 'border-transparent text-[#92adc9] hover:text-white hover:border-[#233648]'
              } transition-all`}
              data-testid="filter-ideas"
            >
              <span className="text-sm font-medium leading-normal tracking-wide">
                Ideas{' '}
                <span className={`text-xs bg-[#233648] px-2 py-0.5 rounded-full ml-1 ${
                  activeFilter === 'ideas' ? 'text-primary' : ''
                }`}>
                  {counts.ideas}
                </span>
              </span>
            </button>
          </div>

          {/* View Options / Filters */}
          <div className="flex items-center gap-2 text-[#92adc9]">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 hover:bg-[#233648] rounded-md transition-colors"
              title="Search"
              data-testid="search-button"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>
            <button
              className="p-2 hover:bg-[#233648] rounded-md transition-colors"
              title="Filter"
              data-testid="filter-button"
            >
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
            </button>
            <button
              className="p-2 hover:bg-[#233648] rounded-md transition-colors"
              title="Sort"
              data-testid="sort-button"
            >
              <span className="material-symbols-outlined text-[20px]">sort</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-4 transition-all">
            <input
              type="text"
              placeholder="Search inbox items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-[#1c2630] border border-[#324d67] rounded-lg text-white placeholder-[#92adc9] focus:outline-none focus:border-primary transition-colors"
              data-testid="search-input"
            />
          </div>
        )}
      </header>

      {/* Scrollable List Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 pb-32">
        <div className="flex flex-col gap-3 max-w-5xl mx-auto">
          {/* Header Row */}
          <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 text-xs font-medium text-[#587391] uppercase tracking-wider">
            <div className="w-7 flex justify-center">
              <input
                type="checkbox"
                checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-[#324d67] bg-transparent text-primary focus:ring-0 focus:ring-offset-0 focus:border-primary cursor-pointer"
                data-testid="select-all-checkbox"
              />
            </div>
            <div className="flex items-center justify-between pr-32">
              <span>Item Details</span>
              <span>Due Date</span>
            </div>
            <div className="w-[100px]">Action</div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20" data-testid="loading-state">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-state">
              <span className="material-symbols-outlined text-[64px] text-[#324d67] mb-4">inbox</span>
              <h3 className="text-white text-xl font-semibold mb-2">
                {searchQuery ? 'No results found' : 'Inbox is empty'}
              </h3>
              <p className="text-[#92adc9] text-sm">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'All caught up! Add new items to process them.'}
              </p>
            </div>
          )}

          {/* Items List */}
          {!loading && filteredItems.map((item) => {
            const isSelected = selectedItems.has(item.id);
            const urgencyLabel = getUrgencyLabel(item);
            const categoryBadge = getCategoryBadge(item.category, item.ai_classification?.category);
            const dateText = formatDate(item.created_at);
            const timeText = formatTime(item.created_at);
            const overdue = isOverdue(item.created_at);

            return (
              <div
                key={item.id}
                className={`group flex items-center gap-4 px-4 min-h-[72px] rounded-xl transition-all ${
                  isSelected
                    ? 'bg-[#1c2630] border border-[#233648] shadow-sm'
                    : 'bg-[#111a22] hover:bg-[#1c2630] border border-transparent hover:border-[#324d67]'
                }`}
                data-testid={`inbox-item-${item.id}`}
              >
                {/* Checkbox */}
                <div className="flex size-7 items-center justify-center shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectItem(item.id)}
                    className="h-5 w-5 rounded border-[#324d67] border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:border-primary focus:outline-none cursor-pointer transition-colors"
                    data-testid={`checkbox-${item.id}`}
                  />
                </div>

                {/* Content */}
                <div className="flex flex-1 items-center gap-4 mr-4 overflow-hidden">
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-white text-base font-medium leading-tight truncate">
                        {item.text}
                      </p>
                      {urgencyLabel && (
                        <span
                          className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getUrgencyColor(urgencyLabel)}`}
                        >
                          {urgencyLabel}
                        </span>
                      )}
                      {item.category && (
                        <span
                          className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${categoryBadge}`}
                        >
                          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[#92adc9] text-xs truncate">
                        {item.ai_classification?.reasoning || `From ${item.source}`}
                      </p>
                    </div>
                  </div>

                  {/* Date/Time */}
                  <div className="shrink-0 text-right min-w-[100px]">
                    <p className={`text-sm font-medium ${overdue ? 'text-red-400' : 'text-[#92adc9]'}`}>
                      {dateText}
                    </p>
                    {timeText && dateText === 'Today' && (
                      <p className="text-[#587391] text-xs">{timeText}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="shrink-0 flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleProcessItem(item)}
                    className="flex h-9 px-4 items-center justify-center rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                    data-testid={`process-button-${item.id}`}
                  >
                    Process
                  </button>
                  <div className="relative group/menu">
                    <button
                      className="size-9 flex items-center justify-center rounded-lg hover:bg-[#324d67] text-[#92adc9] hover:text-white transition-colors"
                      data-testid={`menu-button-${item.id}`}
                    >
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-[#1c2630] border border-[#324d67] rounded-lg shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                      <button
                        onClick={() => handleArchiveItem(item.id)}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#233648] rounded-t-lg transition-colors"
                        data-testid={`archive-button-${item.id}`}
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-[#233648] rounded-b-lg transition-colors"
                        data-testid={`delete-button-${item.id}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batch Action Bar */}
      {selectedItems.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50">
          <div
            className="bg-[#233648] text-white rounded-full shadow-2xl border border-[#324d67] flex items-center justify-between py-2 px-2 pl-6 animate-in slide-in-from-bottom-5 duration-300"
            data-testid="batch-action-bar"
          >
            <div className="flex items-center gap-3 border-r border-[#324d67] pr-4 mr-1">
              <div className="flex size-5 items-center justify-center rounded bg-primary text-white text-[10px] font-bold">
                {selectedItems.size}
              </div>
              <span className="text-sm font-medium">Selected</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleBatchAction('archive')}
                className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-[#324d67] transition-colors text-sm text-[#92adc9] hover:text-white"
                title="Archive selected"
                data-testid="batch-archive-button"
              >
                <span className="material-symbols-outlined text-[20px]">archive</span>
                <span className="hidden sm:inline">Archive</span>
              </button>
              <button
                onClick={() => handleBatchAction('delete')}
                className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-red-900/30 hover:text-red-400 transition-colors text-sm text-[#92adc9]"
                title="Delete selected"
                data-testid="batch-delete-button"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="ml-2 p-1 rounded-full hover:bg-[#324d67] text-[#587391] hover:text-white transition-colors"
              data-testid="clear-selection-button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Process Modal */}
      {processingItem && (
        <ProcessModal
          item={processingItem}
          onClose={() => setProcessingItem(null)}
          onProcess={handleProcessComplete}
        />
      )}
    </div>
  );
}
