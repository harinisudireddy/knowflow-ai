import React, { useState } from 'react';
import { Workspace, UserProfile } from '../types';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { UserAvatar } from '../components/common/UserAvatar';
import { useToast } from '../components/common/Toast';
import {
  Building2,
  Users,
  Shield,
  Key,
  Globe,
  CheckCircle2,
  Copy,
  Plus,
  Mail,
  UserCheck
} from 'lucide-react';

export interface WorkspaceSettingsProps {
  workspace: Workspace;
  currentUser?: UserProfile;
  isDemoMode?: boolean;
  onUpdateWorkspace: (ws: Workspace) => void;
}

export const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({
  workspace,
  currentUser,
  isDemoMode = false,
  onUpdateWorkspace,
}) => {
  const [name, setName] = useState(workspace.name);
  const [allowedDomains, setAllowedDomains] = useState(isDemoMode ? '*.demo.internal' : '*.organization.com');
  const [apiKey] = useState(`kf_live_${workspace.id.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now().toString(36)}`);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Editor' | 'Viewer'>('Editor');
  const [invitedMembers, setInvitedMembers] = useState<{ name: string; email: string; role: string }[]>([]);
  const toast = useToast();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateWorkspace({
      ...workspace,
      name,
    });
    toast.success('Workspace updated', 'Organization tenant settings saved.');
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    toast.success('API Key copied');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast.error('Invalid email', 'Please enter a valid colleague email address');
      return;
    }
    const newMember = {
      name: inviteEmail.split('@')[0],
      email: inviteEmail.trim(),
      role: inviteRole,
    };
    setInvitedMembers(prev => [...prev, newMember]);
    toast.success('Invitation sent', `Invited ${inviteEmail} as ${inviteRole}`);
    setInviteEmail('');
    setIsInviteModalOpen(false);
  };

  const activeMembers = [
    ...(currentUser ? [{ name: currentUser.name, email: currentUser.email, role: 'Workspace Owner' }] : []),
    ...(isDemoMode && !currentUser ? [{ name: 'Demo Evaluator', email: 'demo@knowflow.internal', role: 'Owner' }] : []),
    ...invitedMembers,
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Organization Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage organization tenant name, security rules, team access, and allowed embed domains.
        </p>
      </div>

      {/* General Settings */}
      <form onSubmit={handleSave}>
        <Card padding="md" className="space-y-4">
          <CardHeader
            title="Tenant Profile"
            description="Identification for your multi-tenant workspace instance"
          />

          <Input
            label="Workspace / Organization Name"
            value={name}
            onChange={e => setName(e.target.value)}
            helperText="Appears on all deployed widgets and knowledge reports."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Current Subscription Tier
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <Badge variant="purple" size="md">
                  {workspace.plan || 'Professional'} Plan
                </Badge>
                <span className="text-slate-500 font-medium">Unlimited Assistants & Vector Chunks</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Multi-Tenant Isolation
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Isolated tenant namespace: <code className="text-slate-800 font-mono font-semibold">{workspace.slug || workspace.id}</code></span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="primary" size="sm">
              Save Workspace Settings
            </Button>
          </div>
        </Card>
      </form>

      {/* Security & Embed Domain Whitelist */}
      <Card padding="md" className="space-y-4">
        <CardHeader
          title="Embed Security & Allowed Host Domains"
          description="Prevent unauthorized websites from embedding your assistants"
        />

        <Input
          label="Allowed Origin Domains (CORS)"
          icon={Globe}
          value={allowedDomains}
          onChange={e => setAllowedDomains(e.target.value)}
          helperText="Comma separated list of host domains authorized to load this organization's widget."
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Master API Secret Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              readOnly
              value={apiKey}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700"
            />
            <Button variant="outline" size="sm" icon={Copy} onClick={copyKey}>
              {copiedKey ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Team Members */}
      <Card padding="md">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Workspace Team Members</h3>
            <p className="text-xs text-slate-500">Authorized personnel who can upload knowledge and review analytics.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={() => setIsInviteModalOpen(true)}
          >
            Invite Member
          </Button>
        </div>

        <div className="divide-y divide-slate-100">
          {activeMembers.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              No additional team members invited yet.
            </div>
          ) : (
            activeMembers.map((m, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <UserAvatar name={m.name} size="sm" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{m.name}</p>
                    <p className="text-[11px] text-slate-400">{m.email}</p>
                  </div>
                </div>
                <Badge variant={m.role === 'Workspace Owner' ? 'purple' : 'neutral'} size="sm">
                  {m.role}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Colleague to Workspace"
        description="Grant access to manage assistants, upload documents, or monitor analytics."
        maxWidth="sm"
      >
        <form onSubmit={handleSendInvite} className="space-y-4 pt-2">
          <Input
            label="Work Email"
            type="email"
            placeholder="colleague@company.com"
            icon={Mail}
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Access Role
            </label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="Admin">Admin (Full configuration, documents, billing)</option>
              <option value="Editor">Editor (Upload docs, test assistants, view analytics)</option>
              <option value="Viewer">Viewer (Read-only analytics and playground testing)</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" icon={UserCheck}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
