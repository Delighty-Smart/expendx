import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Gem,
  Plus,
  Settings,
  Home,
  Banknote,
  Wallet,
  Landmark,
  BarChart3,
  Repeat,
  Bell,
  X,
  Brain,
  Target,
  ShieldCheck,
  Compass,
  ChevronDown,
  ChevronRight,
  Hourglass,
  Sparkles,
  Layers,
  History,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import UserAvatar from '@/components/UserAvatar';
import { useLucentChat } from '@/contexts/ChatContext';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, onNewChat }) => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { sendMessage } = useLucentChat();

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Collapsible accordion group states
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    ai: true,
    money: true,
    analytics: false,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const { conversations, loadConversation, deleteConversation } = useLucentChat();

  const filteredHistory = (conversations || []).filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessageSnippet?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Minimalist Gemini Drawer panel */}
      <div className="fixed top-0 left-0 bottom-0 w-72 max-w-[80vw] bg-bg-surface text-text-primary z-50 flex flex-col p-3.5 shadow-xl border-r border-border-default animate-in slide-in-from-left duration-200">
        {/* Top Header: Logo + Close Button */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <img
              src={document.documentElement.classList.contains('dark') ? "/lucent-header-dark.png?v=3" : "/lucent-header-light.png?v=3"}
              alt="Lucent"
              className="h-[20px] max-w-[125px] object-contain opacity-90"
            />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-bg-sidebar-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compressed Action Row: 2 Single Icons Side-by-Side */}
        <div className="py-2 flex items-center gap-1.5 shrink-0 border-b border-border-default/40">
          <button
            onClick={() => {
              onNewChat();
              onClose();
              if (location.pathname !== '/chat') navigate('/chat');
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-bg-sidebar-hover hover:bg-bg-sidebar-active text-text-primary font-medium text-xs transition-colors"
            title="New Chat"
          >
            <Plus className="w-4 h-4 text-text-primary shrink-0" />
            <span>New Chat</span>
          </button>

          <button
            onClick={() => setIsSearching(!isSearching)}
            className={`p-2 rounded-xl transition-colors shrink-0 ${
              isSearching ? 'bg-bg-sidebar-active text-text-primary' : 'bg-bg-sidebar-hover hover:bg-bg-sidebar-active text-text-secondary hover:text-text-primary'
            }`}
            title="Search Chats"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Search Bar (Toggled on Search icon click) */}
        {isSearching && (
          <div className="py-2 shrink-0 animate-fadeIn">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-xs bg-bg-sidebar-hover text-text-primary placeholder:text-text-secondary border border-border-default/60 outline-none focus:border-border-strong transition-all"
              autoFocus
            />
          </div>
        )}

        {/* Minimalist AI Marketplace Banner (Flat, No Glowing Gradient) */}
        <div className="py-2 border-b border-border-default/40 shrink-0">
          <Link
            to="/ai-marketplace"
            onClick={onClose}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-bg-sidebar-hover text-text-secondary hover:text-text-primary transition-colors text-xs font-medium"
          >
            <div className="flex items-center gap-2.5">
              <Gem className="w-4 h-4 text-text-secondary shrink-0" />
              <span>AI Marketplace</span>
            </div>
          </Link>
        </div>

        {/* Main Section: Grouped App Pages (Simplistic Gemini Styling) */}
        <div className="flex-1 overflow-y-auto space-y-3 py-2 scrollbar-none">
          {/* Section 1: AI Intelligence */}
          <div>
            <button
              onClick={() => toggleGroup('ai')}
              className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-tight text-text-secondary">AI Intelligence</span>
              </div>
              {openGroups.ai ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {openGroups.ai && (
              <nav className="space-y-0.5 mt-1">
                {[
                  { path: '/chat', label: 'Lucent Chat', icon: MessageSquare },
                  { path: '/insights', label: 'AI Insights', icon: Brain },
                  { path: '/missions', label: 'Missions', icon: Target },
                  { path: '/time-travel', label: 'Time Travel', icon: Compass },
                ].map(link => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-bg-sidebar-active text-text-primary font-semibold'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Section 2: Money Management */}
          <div>
            <button
              onClick={() => toggleGroup('money')}
              className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-tight text-text-secondary">Money Management</span>
              </div>
              {openGroups.money ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {openGroups.money && (
              <nav className="space-y-0.5 mt-1">
                {[
                  { path: '/dashboard', label: 'Dashboard', icon: Home },
                  { path: '/transactions', label: 'Transactions', icon: Banknote },
                  { path: '/budgets', label: 'Budgets', icon: Wallet },
                  { path: '/savings', label: 'Savings Goals', icon: Landmark },
                  { path: '/subscriptions', label: 'Subscriptions', icon: Repeat },
                ].map(link => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-bg-sidebar-active text-text-primary font-semibold'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Section 3: Analytics & Preferences */}
          <div>
            <button
              onClick={() => toggleGroup('analytics')}
              className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-tight text-text-secondary">Analytics & Settings</span>
              </div>
              {openGroups.analytics ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {openGroups.analytics && (
              <nav className="space-y-0.5 mt-1">
                {[
                  { path: '/reports', label: 'Reports & Trends', icon: BarChart3 },
                  { path: '/life-energy', label: 'Life Energy', icon: Hourglass },
                  { path: '/alerts', label: 'Alerts', icon: Bell },
                  { path: '/trust-center', label: 'Trust & Privacy', icon: ShieldCheck },
                  { path: '/settings', label: 'Settings', icon: Settings },
                ].map(link => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-bg-sidebar-active text-text-primary font-semibold'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
        </div>

        {/* Dedicated Bottom Section: Recent Conversations */}
        <div className="pt-2.5 pb-2 border-t border-border-default/40 shrink-0">
          <p className="px-2 mb-1.5 text-[11px] font-semibold text-text-secondary">Recents</p>
          <div className="space-y-0.5 max-h-32 overflow-y-auto scrollbar-none">
            {filteredHistory.map(item => (
              <div key={item.id} className="group relative flex items-center">
                <button
                  onClick={() => {
                    loadConversation(item.id);
                    onClose();
                    if (location.pathname !== '/chat') {
                      navigate('/chat');
                    }
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover truncate transition-colors flex items-center gap-2 pr-6"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-text-secondary/70 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(item.id);
                  }}
                  className="absolute right-1 p-1 rounded hover:bg-rose-500/10 text-text-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete chat"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="pt-2 border-t border-border-default/40 shrink-0">
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center justify-between p-1.5 rounded-xl hover:bg-bg-sidebar-hover transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                url={profile?.avatar_url}
                name={profile?.username || profile?.first_name || 'User'}
                className="w-7 h-7 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">
                  {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : profile?.username || 'Peter Babalola'}
                </p>
              </div>
            </div>
            <Settings className="w-3.5 h-3.5 text-text-secondary shrink-0" />
          </Link>
        </div>
      </div>
    </>
  );
};
