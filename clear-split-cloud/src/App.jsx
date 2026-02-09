import { useState, useEffect } from 'react'
import { useCollaborativeProject } from './hooks/useCollaborativeProject.js'
import { backend, isBackendConfigured } from './backend/index.ts'
import App from './dafny/app-extras.ts'
import './App.css'

const formatMoney = (cents) => {
  const dollars = Math.abs(cents) / 100
  const sign = cents < 0 ? '-' : ''
  return sign + '$' + dollars.toFixed(2)
}

const parseMoney = (str) => {
  const num = parseFloat(str)
  return isNaN(num) ? 0 : Math.round(num * 100)
}

// Auth component
function Auth({ onAuth }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        await backend.auth.signUp(email, password)
      } else {
        await backend.auth.signIn(email, password)
      }
      // Auth state change listener will handle the rest
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="clear-split auth-container">
      <div className="auth-header">
        <h1>ClearSplit</h1>
        <p>collaborative expense splitting</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          type="email"
          className="form-input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="form-input"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error-msg">{error}</p>}
        <button className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setIsSignUp(!isSignUp)}
          style={{ width: '100%' }}
        >
          {isSignUp ? 'Have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </form>

      <div className="footer">
        State transitions verified by Dafny
      </div>
    </div>
  )
}

// Group selector
function GroupSelector({ user, onSelectGroup }) {
  const [groups, setGroups] = useState([])
  const [invites, setInvites] = useState([])
  const [crossGroupSummary, setCrossGroupSummary] = useState({ totalOwed: 0, totalOwes: 0, netBalance: 0, groups: [] })
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(null)
  const [groupName, setGroupName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [user?.id])

  const loadData = async () => {
    try {
      // Load user's groups with their states for cross-project balances
      const groupsData = await backend.groups.list(user.id)
      const groupsWithData = groupsData.map(g => ({
        group_id: g.id,
        display_name: g.displayName,
        group: { name: g.name, state: g.state }
      }))
      setGroups(groupsWithData)

      // Compute cross-group balances using verified Dafny code
      try {
        const groupEntries = groupsWithData
          .filter(g => g.group?.state)
          .map(g => ({
            groupName: g.group.name,
            displayName: g.display_name,
            model: g.group.state
          }))
        const summary = App.ComputeCrossGroupSummary(groupEntries)
        setCrossGroupSummary({
          totalOwed: App.GetTotalOwed(summary),
          totalOwes: App.GetTotalOwes(summary),
          netBalance: App.GetNetBalance(summary),
          groups: App.GetGroupBalances(summary)
        })
      } catch (e) {
        console.error('Error computing cross-group summary:', e)
        setCrossGroupSummary({ totalOwed: 0, totalOwes: 0, netBalance: 0, groups: [] })
      }
      // Load pending invites for this user
      const invitesData = await backend.invites.listForUser(user.email)
      const invitesWithNames = invitesData.map(inv => ({
        id: inv.id,
        group_id: inv.groupId,
        group: { name: inv.groupName }
      }))
      setInvites(invitesWithNames)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const createGroup = async () => {
    if (!displayName.trim()) {
      setError('Enter your display name')
      return
    }

    try {
      const groupId = await backend.groups.create(
        groupName || 'Expense Group',
        displayName.trim()
      )
      onSelectGroup(groupId)
    } catch (e) {
      setError(e.message)
    }
  }

  const joinGroup = async (groupId) => {
    if (!displayName.trim()) {
      setError('Enter your display name')
      return
    }

    try {
      await backend.invites.accept(groupId, displayName.trim())
      onSelectGroup(groupId)
    } catch (e) {
      setError(e.message)
    }
  }

  const declineInvite = async (inviteId) => {
    await backend.invites.decline(inviteId)
    loadData()
  }

  const handleSignOut = async () => {
    await backend.auth.signOut()
    window.location.reload()
  }

  if (loading) return <div className="clear-split"><p>Loading...</p></div>

  if (showJoin) {
    const invite = invites.find(i => i.group_id === showJoin)
    return (
      <div className="clear-split setup-container">
        <div className="setup-header">
          <h1>Join Group</h1>
          <p>{invite?.group?.name || 'Expense Group'}</p>
        </div>

        <div className="section">
          <div className="form-group full">
            <label className="form-label">Your Display Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Alice"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              This is how you'll appear in expenses
            </p>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button
            className="btn btn-primary"
            onClick={() => joinGroup(showJoin)}
            disabled={!displayName.trim()}
            style={{ width: '100%' }}
          >
            Join Group
          </button>

          <button
            className="btn"
            onClick={() => { setShowJoin(null); setDisplayName(''); setError(null) }}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (showCreate) {
    return (
      <div className="clear-split setup-container">
        <div className="setup-header">
          <h1>New Group</h1>
          <p>create expense splitting group</p>
        </div>

        <div className="section">
          <div className="form-group full">
            <label className="form-label">Group Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Trip to Paris"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="form-group full" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">Your Display Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Alice"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              This is how you'll appear in expenses
            </p>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button
            className="btn btn-primary"
            onClick={createGroup}
            disabled={!displayName.trim()}
            style={{ width: '100%', marginTop: '0.75rem' }}
          >
            Create Group
          </button>

          <button
            className="btn"
            onClick={() => { setShowCreate(false); setDisplayName(''); setError(null) }}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Get totals from verified Dafny computation (already extracted as plain JS)
  const { totalOwed, totalOwes, netBalance, groups: groupBalances } = crossGroupSummary

  return (
    <div className="clear-split group-select">
      <div className="header">
        <h1>ClearSplit</h1>
        <div className="members">{user.email}</div>
      </div>

      {groupBalances.length > 0 && (
        <div className="section">
          <div className="section-title">Cross-Group Summary</div>
          <div className="cross-group-summary">
            <div className="cross-group-totals">
              <div className="cross-group-row">
                <span>You are owed:</span>
                <span className={`amount ${totalOwed > 0 ? 'positive' : ''}`}>
                  {formatMoney(totalOwed)}
                </span>
              </div>
              <div className="cross-group-row">
                <span>You owe:</span>
                <span className={`amount ${totalOwes > 0 ? 'negative' : ''}`}>
                  {formatMoney(totalOwes)}
                </span>
              </div>
              <div className="cross-group-row net">
                <span>Net:</span>
                <span className={`amount ${netBalance > 0 ? 'positive' : netBalance < 0 ? 'negative' : ''}`}>
                  {netBalance >= 0 ? '+' : ''}{formatMoney(netBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {invites.length > 0 && (
        <div className="section">
          <div className="section-title">Invitations</div>
          {invites.map(inv => (
            <div key={inv.id} className="group-item" style={{ cursor: 'default' }}>
              <div>
                <div className="name">{inv.group?.name || 'Expense Group'}</div>
                <div className="meta">You're invited</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-sm" onClick={() => { setShowJoin(inv.group_id); setDisplayName('') }}>
                  Join
                </button>
                <button className="btn btn-sm" onClick={() => declineInvite(inv.id)}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section">
        <div className="section-title">Your Groups</div>
        {groups.length === 0 ? (
          <p className="empty-state">No groups yet</p>
        ) : (
          groups.map(g => {
            const groupBalance = groupBalances.find(b => b.groupName === g.group?.name)
            const balance = groupBalance?.balance || 0
            return (
              <div
                key={g.group_id}
                className="group-item"
                onClick={() => onSelectGroup(g.group_id)}
              >
                <div>
                  <div className="name">{g.group?.name || 'Expense Group'}</div>
                  <div className="meta">as {g.display_name}</div>
                </div>
                {groupBalance && (
                  <span className={`amount ${balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'zero'}`}>
                    {balance > 0 ? 'owed ' : balance < 0 ? 'owe ' : ''}{formatMoney(Math.abs(balance))}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>

      <button
        className="btn btn-primary"
        onClick={() => { setShowCreate(true); setDisplayName('') }}
        style={{ width: '100%' }}
      >
        New Group
      </button>

      <button
        className="btn"
        onClick={handleSignOut}
        style={{ width: '100%', marginTop: '0.5rem' }}
      >
        Sign Out
      </button>

      <div className="footer">
        State transitions verified by Dafny
      </div>
    </div>
  )
}

// Main expense app
function ExpenseApp({ groupId, onBack }) {
  const { client, status, error, dispatch, toggleOffline, serverVersion } = useCollaborativeProject(groupId)

  const [expensePayer, setExpensePayer] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseShares, setExpenseShares] = useState({})
  const [settlementFrom, setSettlementFrom] = useState('')
  const [settlementTo, setSettlementTo] = useState('')
  const [settlementAmount, setSettlementAmount] = useState('')
  const [activeTab, setActiveTab] = useState('balances')
  const [localError, setLocalError] = useState(null)
  const [statusMsg, setStatusMsg] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [pendingInvites, setPendingInvites] = useState([])
  const [groupName, setGroupName] = useState('')

  // Load ownership status, group name, and pending invites
  useEffect(() => {
    const loadGroupInfo = async () => {
      const user = await backend.auth.getCurrentUser()
      if (!user) return

      // Check if current user is owner
      const groupInfo = await backend.groups.getInfo(groupId)
      setIsOwner(groupInfo.ownerId === user.id)
      setGroupName(groupInfo.name || '')

      // Load pending invites
      const invites = await backend.invites.listForGroup(groupId)
      setPendingInvites(invites.map(inv => ({ id: inv.id, email: inv.email })))
    }
    loadGroupInfo()
  }, [groupId])

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return
    try {
      await backend.invites.create(groupId, inviteEmail.trim())
      setInviteEmail('')
      showStatus('Invitation sent')
      // Reload invites
      const invites = await backend.invites.listForGroup(groupId)
      setPendingInvites(invites.map(inv => ({ id: inv.id, email: inv.email })))
    } catch (e) {
      setLocalError(e.message)
    }
  }

  const cancelInvite = async (inviteId) => {
    await backend.invites.cancel(inviteId)
    setPendingInvites(pendingInvites.filter(i => i.id !== inviteId))
  }

  const model = client ? App.ClientModel(client) : null
  const members = model ? App.Members(model) : []
  const balances = model ? App.Balances(model) : {}
  const expenses = model ? App.Expenses(model) : []
  const settlements = model ? App.Settlements(model) : []

  useEffect(() => {
    if (members.length > 0 && !expensePayer) {
      setExpensePayer(members[0])
      setSettlementFrom(members[0])
      setSettlementTo(members[1] || members[0])
      const shares = {}
      members.forEach(m => shares[m] = true)
      setExpenseShares(shares)
    }
  }, [members])

  const showStatus = (msg) => {
    setStatusMsg(msg)
    setTimeout(() => setStatusMsg(null), 2000)
  }

  const addExpense = () => {
    const amountCents = parseMoney(expenseAmount)
    if (amountCents <= 0) {
      setLocalError('Invalid amount')
      return
    }

    const participants = Object.keys(expenseShares).filter(k => expenseShares[k])
    if (participants.length === 0) {
      setLocalError('Select participants')
      return
    }

    const sharePerPerson = Math.floor(amountCents / participants.length)
    const remainder = amountCents - (sharePerPerson * participants.length)

    const shares = {}
    participants.forEach((p, i) => {
      shares[p] = sharePerPerson + (i < remainder ? 1 : 0)
    })

    const expense = App.MakeExpense(expensePayer, amountCents, shares, participants)
    const action = App.AddExpense(expense)
    dispatch(action)

    setExpenseAmount('')
    setLocalError(null)
    showStatus('Expense recorded')
  }

  const addSettlement = () => {
    const amountCents = parseMoney(settlementAmount)
    if (amountCents <= 0) {
      setLocalError('Invalid amount')
      return
    }
    if (settlementFrom === settlementTo) {
      setLocalError('From/To must differ')
      return
    }

    const settlement = App.MakeSettlement(settlementFrom, settlementTo, amountCents)
    const action = App.AddSettlement(settlement)
    dispatch(action)

    setSettlementAmount('')
    setLocalError(null)
    showStatus('Payment recorded')
  }

  if (!model) {
    return (
      <div className="clear-split">
        <p>{status === 'error' ? error : 'Loading...'}</p>
        <button className="btn" onClick={onBack}>Back</button>
      </div>
    )
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="clear-split">
      <div className="header">
        <h1>ClearSplit</h1>
        <div className="members">{groupName}: {members.join(' / ')}</div>
      </div>

      <div className="status-bar">
        <span className={`status-indicator ${status}`}>
          {status === 'synced' ? 'synced' :
           status === 'syncing' ? 'syncing...' :
           status === 'pending' ? 'saving...' :
           status === 'offline' ? 'offline' :
           status === 'error' ? 'error' : status}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#666' }}>v{serverVersion}</span>
        <button className="btn btn-sm" onClick={toggleOffline}>
          {status === 'offline' ? 'Go Online' : 'Go Offline'}
        </button>
        <button className="btn btn-sm" onClick={onBack}>Exit</button>
      </div>

      <div className="tabs">
        {['balances', 'expense', 'settle', 'history', 'members'].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {(error || localError) && <p className="error-msg">{error || localError}</p>}

      {activeTab === 'balances' && (
        <div className="section">
          <table className="balance-table">
            <thead>
              <tr>
                <th>Member</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const bal = balances[m] || 0
                const cls = bal > 0 ? 'positive' : bal < 0 ? 'negative' : ''
                return (
                  <tr key={m} className={cls}>
                    <td className="name">{m}</td>
                    <td className="amount">{formatMoney(bal)}</td>
                    <td className="status">
                      {bal > 0 ? 'owed' : bal < 0 ? 'owes' : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="summary-row">
            <span>Total expenses</span>
            <span>{formatMoney(totalExpenses)}</span>
          </div>
        </div>
      )}

      {activeTab === 'expense' && (
        <div className="section">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Paid by</label>
              <select
                className="form-select"
                value={expensePayer}
                onChange={(e) => setExpensePayer(e.target.value)}
              >
                {members.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group full">
            <label className="form-label">Split among</label>
            <div className="checkbox-row">
              {members.map(m => (
                <label key={m} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={expenseShares[m] || false}
                    onChange={(e) => setExpenseShares({...expenseShares, [m]: e.target.checked})}
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={addExpense}>
            Add Expense
          </button>
          <p className="status-msg">{statusMsg || '\u00A0'}</p>
        </div>
      )}

      {activeTab === 'settle' && (
        <div className="section">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">From</label>
              <select
                className="form-select"
                value={settlementFrom}
                onChange={(e) => setSettlementFrom(e.target.value)}
              >
                {members.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">To</label>
              <select
                className="form-select"
                value={settlementTo}
                onChange={(e) => setSettlementTo(e.target.value)}
              >
                {members.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(e.target.value)}
              />
            </div>
          </div>

          <button className="btn btn-primary" onClick={addSettlement}>
            Record Payment
          </button>
          <p className="status-msg">{statusMsg || '\u00A0'}</p>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="section">
          {expenses.length === 0 && settlements.length === 0 ? (
            <p className="empty-state">No transactions</p>
          ) : (
            <>
              {expenses.map((e, i) => (
                <div key={`e${i}`} className="history-item expense">
                  <span className="tag">Exp</span>
                  <span className="detail">
                    {e.paidBy}
                    <span className="meta"> → {e.shareKeys.join(', ')}</span>
                  </span>
                  <span className="amount">{formatMoney(e.amount)}</span>
                </div>
              ))}
              {settlements.map((s, i) => (
                <div key={`s${i}`} className="history-item settlement">
                  <span className="tag">Pay</span>
                  <span className="detail">{s.from} → {s.to}</span>
                  <span className="amount">{formatMoney(s.amount)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="section">
          <div className="section-title">Current Members</div>
          {members.map(m => (
            <div key={m} className="group-item" style={{ cursor: 'default' }}>
              <div className="name">{m}</div>
            </div>
          ))}

          {isOwner && (
            <>
              <div className="section-title" style={{ marginTop: '1.5rem' }}>Invite New Member</div>
              <div className="form-row">
                <input
                  type="email"
                  className="form-input"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && inviteMember()}
                />
                <button className="btn" onClick={inviteMember}>Invite</button>
              </div>

              {pendingInvites.length > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: '1rem' }}>Pending Invites</div>
                  {pendingInvites.map(inv => (
                    <div key={inv.id} className="group-item" style={{ cursor: 'default' }}>
                      <div className="meta">{inv.email}</div>
                      <button className="btn btn-sm" onClick={() => cancelInvite(inv.id)}>Cancel</button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          <p className="status-msg">{statusMsg || '\u00A0'}</p>
        </div>
      )}

      <div className="footer">
        Conservation verified: balances sum to zero
      </div>
    </div>
  )
}

// Main app with routing
function ClearSplitApp() {
  const [user, setUser] = useState(null)
  const [groupId, setGroupId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!isBackendConfigured()) {
      setLoading(false)
      return
    }

    const unsubscribe = backend.auth.onAuthChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  if (!isBackendConfigured()) {
    return (
      <div className="clear-split auth-container">
        <div className="auth-header">
          <h1>ClearSplit</h1>
          <p>collaborative expense splitting</p>
        </div>
        <p className="error-msg">
          Backend not configured. Set VITE_BACKEND and required credentials in .env
        </p>
        <div className="footer">
          State transitions verified by Dafny
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="clear-split auth-container">
        <div className="auth-header">
          <h1>ClearSplit</h1>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth onAuth={setUser} />
  }

  if (!groupId) {
    return <GroupSelector key={refreshKey} user={user} onSelectGroup={setGroupId} />
  }

  const handleBack = () => {
    setGroupId(null)
    setRefreshKey(k => k + 1)
  }

  return <ExpenseApp groupId={groupId} onBack={handleBack} />
}

export default ClearSplitApp
