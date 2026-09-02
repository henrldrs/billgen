import { useState } from 'react';
import {
  SettingsShell,
  Card,
  Button,
  Field,
  TextInput,
  Textarea,
  Select,
  Switch,
  Badge,
  Banner,
  Table,
  TableColumn,
  Modal,
  ProgressBar,
} from '../ui';
import { useBillGen } from '../../context/BillGenContext';
import { ActiveSession, TeamMember, SystemServiceStatus } from '../../types';

export function SettingsView() {
  const {
    company,
    updateCompanyProfile,
    subscription,
    upgradeSubscription,
    sessions,
    revokeSession,
    teamMembers,
    inviteTeamMember,
    systemStatus,
    activityLogs,
    addToast,
    triggerConfetti,
  } = useBillGen();

  const [activeTab, setActiveTab] = useState('company');

  // Company Form state
  const [name, setName] = useState(company.name);
  const [bceNumber, setBceNumber] = useState(company.bceNumber);
  const [iban, setIban] = useState(company.iban);
  const [bic, setBic] = useState(company.bic);
  const [address, setAddress] = useState(company.address);
  const [email, setEmail] = useState(company.email);
  const [phone, setPhone] = useState(company.phone);
  const [invoicePrefix, setInvoicePrefix] = useState(company.invoicePrefix);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(company.nextInvoiceNumber);

  // Invite modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('accountant');

  // Billing billingCycle toggle
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleSaveCompany = () => {
    updateCompanyProfile({
      name,
      bceNumber,
      iban,
      bic,
      address,
      email,
      phone,
      invoicePrefix,
      nextInvoiceNumber: Number(nextInvoiceNumber) || 1,
    });
  };

  const handleInviteSubmit = () => {
    if (!inviteEmail.trim()) return;
    inviteTeamMember(inviteName || inviteEmail.split('@')[0], inviteEmail, inviteRole);
    setInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
  };

  const sections = [
    {
      title: 'Organisation & Paramètres',
      items: [
        { key: 'company', label: 'Identité Légale (BCE/TVA)', icon: '🏛️' },
        { key: 'invoicing', label: 'Préférences de Facturation', icon: '⚙️' },
        { key: 'peppol', label: 'Réseau Peppol e-Invoicing', icon: '🇧🇪' },
        { key: 'team', label: 'Équipe & Collaborateurs', icon: '👥' },
      ],
    },
    {
      title: 'Sécurité & Abonnement',
      items: [
        { key: 'security', label: 'Sécurité & Sessions Actives', icon: '🛡️' },
        { key: 'billing', label: 'Abonnement & Facturation', icon: '💳' },
        { key: 'gdpr', label: 'Confidentialité & RGPD', icon: '🔒' },
        { key: 'system', label: 'État des Services (Status)', icon: '🟢' },
      ],
    },
  ];

  const sessionColumns: TableColumn<ActiveSession>[] = [
    {
      key: 'device',
      label: 'Appareil / Navigateur',
      render: (s) => (
        <div>
          <div className="font-semibold text-[var(--bg-navy)]">{s.device}</div>
          <div className="text-xs text-[var(--bg-muted)]">{s.browser}</div>
        </div>
      ),
    },
    {
      key: 'ip',
      label: 'Adresse IP',
      render: (s) => <span className="bg-num text-xs font-mono">{s.ip}</span>,
    },
    {
      key: 'location',
      label: 'Localisation',
      render: (s) => <span className="text-xs">{s.location}</span>,
    },
    {
      key: 'lastActive',
      label: 'Dernière activité',
      render: (s) => (
        <span className="text-xs">
          {s.isCurrent ? <span className="text-emerald-600 font-bold">● Session Actuelle</span> : s.lastActive}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      render: (s) =>
        !s.isCurrent ? (
          <Button variant="danger" size="sm" onClick={() => revokeSession(s.id)}>
            Déconnecter
          </Button>
        ) : null,
    },
  ];

  const teamColumns: TableColumn<TeamMember>[] = [
    {
      key: 'name',
      label: 'Membre',
      render: (m) => (
        <div>
          <div className="font-semibold text-[var(--bg-navy)]">{m.name}</div>
          <div className="text-xs text-[var(--bg-muted)]">{m.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Rôle d’accès',
      render: (m) => (
        <span className="capitalize text-xs font-medium bg-[var(--bg-app-shell)] px-2 py-0.5 rounded border border-[var(--bg-border)]">
          {m.role === 'admin'
            ? 'Administrateur'
            : m.role === 'accountant'
            ? 'Expert-Comptable'
            : m.role === 'manager'
            ? 'Gestionnaire'
            : 'Lecteur'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'État',
      render: (m) => (
        <span
          className={`text-xs font-semibold ${
            m.status === 'active' ? 'text-emerald-600' : 'text-amber-600'
          }`}
        >
          {m.status === 'active' ? 'Actif' : 'Invitation en attente'}
        </span>
      ),
    },
  ];

  const statusColumns: TableColumn<SystemServiceStatus>[] = [
    {
      key: 'service',
      label: 'Service Infrastructure',
      render: (s) => <span className="font-semibold text-[var(--bg-navy)]">{s.service}</span>,
    },
    {
      key: 'status',
      label: 'État',
      render: (s) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Opérationnel
        </span>
      ),
    },
    {
      key: 'uptime',
      label: 'Disponibilité (30j)',
      render: (s) => <span className="bg-num font-mono text-xs">{s.uptime}</span>,
    },
    {
      key: 'latency',
      label: 'Temps de réponse',
      render: (s) => <span className="bg-num font-mono text-xs">{s.latency}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--bg-navy)]">Paramètres du Compte & Organisation</h2>
        <p className="text-xs text-[var(--bg-muted)]">
          Configuration des mentions légales belges, réseau Peppol, sécurité, accès comptable et abonnements.
        </p>
      </div>

      <SettingsShell sections={sections} activeKey={activeTab} onSelectKey={setActiveTab}>
        {/* Tab 1: Company Legal Identity */}
        {activeTab === 'company' && (
          <Card
            title="Identité Légale & Registre BCE"
            subtitle="Ces informations sont obligatoires et figurent sur l'ensemble de vos factures et flux Peppol"
            footer={
              <div className="flex justify-end">
                <Button variant="primary" onClick={handleSaveCompany}>
                  Enregistrer les modifications
                </Button>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Dénomination sociale officielle" required>
                  <TextInput value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Numéro d’entreprise BCE / TVA" required>
                  <TextInput value={bceNumber} onChange={(e) => setBceNumber(e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Compte IBAN officiel de paiement" required>
                  <TextInput value={iban} onChange={(e) => setIban(e.target.value)} />
                </Field>
                <Field label="Code BIC / SWIFT" required>
                  <TextInput value={bic} onChange={(e) => setBic(e.target.value)} />
                </Field>
              </div>

              <Field label="Adresse du siège social" required>
                <TextInput value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Email légal de contact">
                  <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Numéro de téléphone">
                  <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
              </div>
            </div>
          </Card>
        )}

        {/* Tab 2: Invoicing Preferences */}
        {activeTab === 'invoicing' && (
          <Card
            title="Numérotation & Conditions Générales"
            subtitle="Paramétrage du format des factures et du délai de paiement légal"
            footer={
              <div className="flex justify-end">
                <Button variant="primary" onClick={handleSaveCompany}>
                  Sauvegarder les préférences
                </Button>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Préfixe de numérotation chronologique" required>
                  <TextInput
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="FAC-2026-"
                  />
                </Field>
                <Field label="Prochain numéro séquentiel" required>
                  <TextInput
                    type="number"
                    value={nextInvoiceNumber}
                    onChange={(e) => setNextInvoiceNumber(Number(e.target.value))}
                  />
                </Field>
              </div>

              <Field label="Mentions légales & Clause de réserve de propriété">
                <Textarea
                  rows={3}
                  defaultValue="Tout retard de paiement entraîne de plein droit et sans mise en demeure un intérêt de retard de 12% l'an ainsi qu'une indemnité forfaitaire de 10% (min. 40 €). Les marchandises restent la propriété de l'émetteur jusqu'au paiement intégral."
                />
              </Field>
            </div>
          </Card>
        )}

        {/* Tab 3: Peppol e-Invoicing Network */}
        {activeTab === 'peppol' && (
          <Card
            title="Connexion au Réseau Peppol (e-Invoicing Belgique 2026)"
            subtitle="Conformité obligatoire B2B avec l'annuaire SMP et point d'accès certifié"
          >
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                    Point d'accès Peppol Actif & Certifié
                  </div>
                  <div className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Identifiant SMP : <span className="font-mono font-bold">iso6523-actorid-upis::0208:{company.bceNumber.replace(/\D/g, '')}</span>
                  </div>
                </div>
                <Badge status="paid">Opérationnel</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-[var(--bg-app-shell)] p-3 rounded-lg border border-[var(--bg-border)] space-y-1">
                  <div className="font-semibold text-[var(--bg-navy)]">Format d'échange actif</div>
                  <div className="text-[var(--bg-muted)]">UBL Invoice 2.1 (BIS Billing 3.0 Standard Européen EN 16931)</div>
                </div>
                <div className="bg-[var(--bg-app-shell)] p-3 rounded-lg border border-[var(--bg-border)] space-y-1">
                  <div className="font-semibold text-[var(--bg-navy)]">Accusés de réception AS4</div>
                  <div className="text-emerald-600 font-medium">Réception et validation automatique des messages MLR</div>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => addToast('Test de connectivité Peppol réussi. Réponse 200 OK.', 'success')}
              >
                Tester la connectivité réseau (Ping Peppol)
              </Button>
            </div>
          </Card>
        )}

        {/* Tab 4: Team & Access */}
        {activeTab === 'team' && (
          <Card
            title="Collaborateurs & Accès Expert-Comptable"
            subtitle="Gérez les permissions de votre équipe et offrez un accès direct à votre fiduciaire"
            actions={
              <Button variant="primary" size="sm" onClick={() => setInviteModalOpen(true)}>
                + Inviter un Membre / Comptable
              </Button>
            }
            padded={false}
          >
            <Table columns={teamColumns} rows={teamMembers} rowKey={(m) => m.id} />
          </Card>
        )}

        {/* Tab 5: Security & Sessions */}
        {activeTab === 'security' && (
          <Card
            title="Sécurité & Sessions Actives"
            subtitle="Consultez les appareils connectés et révoquez les accès suspects"
            padded={false}
          >
            <Table columns={sessionColumns} rows={sessions} rowKey={(s) => s.id} />
          </Card>
        )}

        {/* Tab 6: Billing & Plans */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <Card title="Abonnement Actuel & Consommation" subtitle="Détail de votre forfait SaaS">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-[var(--bg-app-shell)] rounded-lg border border-[var(--bg-border)]">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[var(--bg-muted)] font-semibold">Plan</span>
                    <div className="text-lg font-bold text-[var(--bg-navy)]">{subscription.plan.toUpperCase()}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[var(--bg-muted)]">Prix</span>
                    <div className="text-lg font-bold bg-num text-[var(--bg-accent)]">
                      {subscription.price === 0 ? 'Gratuit' : `${subscription.price} € / mois`}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ProgressBar
                    value={subscription.usage.invoicesUsed}
                    max={subscription.usage.invoicesLimit}
                    label="Factures ce mois"
                    hint={`${subscription.usage.invoicesUsed} / ${subscription.usage.invoicesLimit}`}
                  />
                  <ProgressBar
                    value={subscription.usage.clientsUsed}
                    max={subscription.usage.clientsLimit}
                    label="Clients enregistrés"
                    hint={`${subscription.usage.clientsUsed} / ${subscription.usage.clientsLimit}`}
                    tone="navy"
                  />
                </div>
              </div>
            </Card>

            {/* Plans comparison cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border ${subscription.plan === 'free' ? 'border-[var(--bg-accent)] bg-[var(--bg-card)]' : 'border-[var(--bg-border)] bg-[var(--bg-app-shell)]'} space-y-3`}>
                <div className="font-bold text-base">FREE</div>
                <div className="text-2xl font-bold bg-num">0 €</div>
                <p className="text-xs text-[var(--bg-muted)]">Pour indépendants démarrant leur activité.</p>
                <ul className="text-xs space-y-1.5 text-[var(--bg-muted)]">
                  <li>✓ 20 factures / mois</li>
                  <li>✓ 10 clients</li>
                  <li>✓ Conformité Peppol de base</li>
                </ul>
                {subscription.plan !== 'free' && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => upgradeSubscription('free', 'monthly')}>
                    Rétrograder
                  </Button>
                )}
              </div>

              <div className={`p-4 rounded-lg border ${subscription.plan === 'professional' ? 'border-[var(--bg-accent)] shadow-md bg-[var(--bg-card)]' : 'border-[var(--bg-border)] bg-[var(--bg-app-shell)]'} space-y-3`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-base text-[var(--bg-accent)]">PROFESSIONAL</span>
                  <span className="text-[10px] bg-[var(--bg-accent)] text-white px-2 py-0.5 rounded font-bold">Populaire</span>
                </div>
                <div className="text-2xl font-bold bg-num">19 € <span className="text-xs font-normal text-[var(--bg-muted)]">/ mois</span></div>
                <p className="text-xs text-[var(--bg-muted)]">Facturation illimitée et transmission Peppol automatique.</p>
                <ul className="text-xs space-y-1.5">
                  <li>✓ 100 factures / mois</li>
                  <li>✓ Clients illimités</li>
                  <li>✓ Relances automatiques d'impayés</li>
                  <li>✓ Accès expert-comptable dédié</li>
                </ul>
                {subscription.plan !== 'professional' && (
                  <Button variant="primary" size="sm" className="w-full" onClick={() => upgradeSubscription('professional', 'monthly')}>
                    Passer à Professional
                  </Button>
                )}
              </div>

              <div className={`p-4 rounded-lg border ${subscription.plan === 'enterprise' ? 'border-[var(--bg-accent)] bg-[var(--bg-card)]' : 'border-[var(--bg-border)] bg-[var(--bg-app-shell)]'} space-y-3`}>
                <div className="font-bold text-base">ENTERPRISE</div>
                <div className="text-2xl font-bold bg-num">49 € <span className="text-xs font-normal text-[var(--bg-muted)]">/ mois</span></div>
                <p className="text-xs text-[var(--bg-muted)]">Pour PME avec multi-utilisateurs et API dédiée.</p>
                <ul className="text-xs space-y-1.5 text-[var(--bg-muted)]">
                  <li>✓ Facturation illimitée</li>
                  <li>✓ Multi-utilisateurs avancés</li>
                  <li>✓ Intégration API & Webhooks</li>
                  <li>✓ Support prioritaire 24/7</li>
                </ul>
                {subscription.plan !== 'enterprise' && (
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => upgradeSubscription('enterprise', 'monthly')}>
                    Passer à Enterprise
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: GDPR & Privacy */}
        {activeTab === 'gdpr' && (
          <Card title="Protection des Données & RGPD" subtitle="Conformité européenne et portabilité des données">
            <div className="space-y-4 text-xs">
              <Banner tone="info" title="Hébergement Européen & Souveraineté">
                Toutes vos données financières et clients sont stockées exclusivement dans des centres de données situés dans l'Union Européenne (Règlement Général sur la Protection des Données 2016/679).
              </Banner>

              <div className="space-y-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => addToast('Archive RGPD complète (JSON) téléchargée', 'success')}
                >
                  📥 Exporter l'intégralité de mes données (Droit à la portabilité)
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Tab 8: System Status */}
        {activeTab === 'system' && (
          <Card
            title="État Opérationnel des Systèmes (System Status)"
            subtitle="Surveillance temps réel des API, passerelles Peppol et bases de données"
            padded={false}
          >
            <Table columns={statusColumns} rows={systemStatus} rowKey={(s) => s.service} />
          </Card>
        )}
      </SettingsShell>

      {/* Invite member modal */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Inviter un collaborateur ou votre expert-comptable"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setInviteModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleInviteSubmit}>
              Envoyer l'invitation
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <Field label="Nom complet">
            <TextInput value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Ex: Jean Dupont" />
          </Field>
          <Field label="Adresse email professionnelle" required>
            <TextInput
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="jean@fiduciaire.be"
            />
          </Field>
          <Field label="Rôle et niveau d'accès" required>
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              options={[
                { value: 'accountant', label: 'Expert-Comptable (Accès exports & TVA)' },
                { value: 'admin', label: 'Administrateur (Tous les droits)' },
                { value: 'manager', label: 'Gestionnaire des ventes' },
                { value: 'viewer', label: 'Lecture seule' },
              ]}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
