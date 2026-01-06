import { useState } from 'react'
import App from './dafny/app-extras.ts'
import './App.css'

const formatMoney = (cents) => {
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  return sign + '$' + dollars.toFixed(2);
};

const parseMoney = (str) => {
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num * 100);
};

function ClearSplit() {
  const [setupMode, setSetupMode] = useState(true);
  const [memberInput, setMemberInput] = useState('');
  const [membersList, setMembersList] = useState([]);
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);

  const [expensePayer, setExpensePayer] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseShares, setExpenseShares] = useState({});

  const [settlementFrom, setSettlementFrom] = useState('');
  const [settlementTo, setSettlementTo] = useState('');
  const [settlementAmount, setSettlementAmount] = useState('');

  const [activeTab, setActiveTab] = useState('balances');
  const [status, setStatus] = useState(null);

  const showStatus = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 2000);
  };

  const addMember = () => {
    const name = memberInput.trim();
    if (name && !membersList.includes(name)) {
      setMembersList([...membersList, name]);
      setMemberInput('');
    }
  };

  const removeMember = (name) => {
    setMembersList(membersList.filter(m => m !== name));
  };

  const startGroup = () => {
    if (membersList.length < 2) {
      setError('Minimum 2 members required');
      return;
    }
    const result = App.Init(membersList);
    if (result.ok) {
      setModel(result.model);
      setSetupMode(false);
      setError(null);
      const shares = {};
      membersList.forEach(m => shares[m] = true);
      setExpenseShares(shares);
      setExpensePayer(membersList[0]);
      setSettlementFrom(membersList[0]);
      setSettlementTo(membersList[1]);
    } else {
      setError('Initialization failed');
    }
  };

  const addExpense = () => {
    const amountCents = parseMoney(expenseAmount);
    if (amountCents <= 0) {
      setError('Invalid amount');
      return;
    }

    const participants = Object.keys(expenseShares).filter(k => expenseShares[k]);
    if (participants.length === 0) {
      setError('Select participants');
      return;
    }

    const sharePerPerson = Math.floor(amountCents / participants.length);
    const remainder = amountCents - (sharePerPerson * participants.length);

    const shares = {};
    participants.forEach((p, i) => {
      shares[p] = sharePerPerson + (i < remainder ? 1 : 0);
    });

    const expense = App.MakeExpense(expensePayer, amountCents, shares);
    const action = App.AddExpense(expense);
    const result = App.Dispatch(model, action);

    if (result.ok) {
      setModel(result.model);
      setExpenseAmount('');
      setError(null);
      showStatus('Expense recorded');
    } else {
      setError('Failed to add expense');
    }
  };

  const addSettlement = () => {
    const amountCents = parseMoney(settlementAmount);
    if (amountCents <= 0) {
      setError('Invalid amount');
      return;
    }
    if (settlementFrom === settlementTo) {
      setError('From/To must differ');
      return;
    }

    const settlement = App.MakeSettlement(settlementFrom, settlementTo, amountCents);
    const action = App.AddSettlement(settlement);
    const result = App.Dispatch(model, action);

    if (result.ok) {
      setModel(result.model);
      setSettlementAmount('');
      setError(null);
      showStatus('Payment recorded');
    } else {
      setError('Failed to add settlement');
    }
  };

  // Setup screen
  if (setupMode) {
    return (
      <div className="clear-split setup-container">
        <div className="setup-header">
          <h1>ClearSplit</h1>
          <p>correct-by-construction group expense tracking</p>
        </div>

        <div className="section">
          <div className="section-title">Members</div>
          <div className="member-input-row">
            <input
              type="text"
              className="form-input"
              placeholder="Name"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMember()}
            />
            <button className="btn" onClick={addMember}>Add</button>
          </div>

          <div className="members-list">
            {membersList.map(m => (
              <div key={m} className="member-chip">
                {m}
                <button onClick={() => removeMember(m)}>×</button>
              </div>
            ))}
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button
            className="btn btn-primary"
            onClick={startGroup}
            disabled={membersList.length < 2}
            style={{ width: '100%' }}
          >
            Start ({membersList.length})
          </button>
        </div>

        <div className="footer">
          State transitions verified by Dafny
        </div>
      </div>
    );
  }

  const members = App.Members(model);
  const balances = App.Balances(model);
  const expenses = App.Expenses(model);
  const settlements = App.Settlements(model);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="clear-split">
      <div className="header">
        <h1>ClearSplit</h1>
        <div className="members">{members.join(' / ')}</div>
      </div>

      <div className="tabs">
        {['balances', 'expense', 'settle', 'history'].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && <p className="error-msg">{error}</p>}

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
                const bal = balances[m] || 0;
                const cls = bal > 0 ? 'positive' : bal < 0 ? 'negative' : '';
                return (
                  <tr key={m} className={cls}>
                    <td className="name">{m}</td>
                    <td className="amount">{formatMoney(bal)}</td>
                    <td className="status">
                      {bal > 0 ? 'owed' : bal < 0 ? 'owes' : '—'}
                    </td>
                  </tr>
                );
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
                step="1"
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
          <p className="status-msg">{status || '\u00A0'}</p>
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
                step="1"
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
          <p className="status-msg">{status || '\u00A0'}</p>
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

      <div className="footer">
        Conservation verified: balances sum to zero
      </div>
    </div>
  );
}

export default ClearSplit;
