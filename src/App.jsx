import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  signInWithCustomToken,
  signInAnonymously,
  deleteUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  where,
  setDoc,
  getDocs,
  getDoc,
  arrayUnion,
  writeBatch
} from 'firebase/firestore';
import { 
  PieChart, 
  Wallet, 
  Users, 
  Plus, 
  ArrowRight, 
  CheckCircle, 
  Mic, 
  MicOff, 
  LogOut, 
  Activity,
  DollarSign,
  AlertCircle,
  User,
  CheckSquare,
  X,
  Settings,
  Edit2,
  Trash2,
  History,
  Check
} from 'lucide-react';

// --- Firebase Configuration & Init ---
const firebaseConfig = `Your firebase config`
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'fairshare-default';

// --- Utility Functions ---

const getFriendlyAuthError = (errorCode) => {
  switch (errorCode) {
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/user-disabled': return 'This account has been disabled.';
    case 'auth/user-not-found': return 'No account found with this email.';
    case 'auth/wrong-password': return 'Incorrect password.';
    case 'auth/email-already-in-use': return 'This email is already registered.';
    case 'auth/weak-password': return 'Password should be at least 6 characters.';
    case 'auth/operation-not-allowed': return 'Email/Password login is not enabled in Firebase Console.';
    case 'auth/requires-recent-login': return 'Please log out and log in again to perform this action.';
    default: return 'An unexpected error occurred. Please try again.';
  }
};

const simplifyDebts = (balances) => {
  const debtors = [];
  const creditors = [];

  Object.entries(balances).forEach(([uid, amount]) => {
    if (amount < -0.01) debtors.push({ uid, amount });
    if (amount > 0.01) creditors.push({ uid, amount });
  });

  debtors.sort((a, b) => a.amount - b.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

    transactions.push({
      from: debtor.uid,
      to: creditor.uid,
      amount: parseFloat(amount.toFixed(2))
    });

    debtor.amount += amount;
    creditor.amount -= amount;

    if (Math.abs(debtor.amount) < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return transactions;
};

// --- Components ---

const AuthScreen = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
    } catch (err) {
      setError(getFriendlyAuthError(err.code));
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setIsGuestLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err) {
      setError("Guest login failed: " + err.message);
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-3 rounded-full">
            <Wallet className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-center text-white mb-2">FairShare</h2>
        <p className="text-center text-slate-400 mb-8">Smart expense splitting for groups</p>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 text-sm flex items-center gap-2 animate-pulse">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-slate-400 text-sm mb-1">Full Name</label>
              <input 
                type="text" 
                required 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-slate-400 text-sm mb-1">Email</label>
            <input 
              type="email" 
              required 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Password</label>
            <input 
              type="password" 
              required 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold p-3 rounded-lg transition-all mt-4">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-800 text-slate-500">Or</span>
          </div>
        </div>

        <button 
          onClick={handleGuestLogin}
          disabled={isGuestLoading}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium p-3 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          {isGuestLoading ? 'Loading...' : <><User size={18} /> Continue as Guest</>}
        </button>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-slate-400 hover:text-white text-sm"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Modals ---

const UserSettingsModal = ({ user, onClose }) => {
    const [newName, setNewName] = useState(user.displayName || '');
    const [msg, setMsg] = useState({ type: '', text: '' });

    const handleUpdateName = async () => {
        try {
            await updateProfile(user, { displayName: newName });
            // Sync with users collection
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), {
                displayName: newName
            });
            setMsg({ type: 'success', text: 'Username updated!' });
        } catch (e) {
            setMsg({ type: 'error', text: 'Failed to update name.' });
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you sure? This cannot be undone.")) return;
        try {
            await deleteUser(user);
        } catch (e) {
            setMsg({ type: 'error', text: getFriendlyAuthError(e.code) });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Account Settings</h3>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
                </div>

                {msg.text && (
                    <div className={`p-3 rounded-lg mb-4 text-sm ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {msg.text}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400">Display Name</label>
                        <input 
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <button onClick={handleUpdateName} className="mt-2 text-sm text-blue-400 hover:text-blue-300">Update Name</button>
                    </div>
                    <div className="pt-4 border-t border-slate-700">
                        <button onClick={handleDeleteAccount} className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white p-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                            <Trash2 size={16} /> Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GroupSettingsModal = ({ group, onClose, onDelete }) => {
    const [name, setName] = useState(group.name);

    const handleUpdate = async () => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'groups', group.id), { name });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Group Settings</h3>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400">Group Name</label>
                        <input 
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <button onClick={handleUpdate} className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white p-2 rounded">Save Changes</button>
                    </div>
                    <div className="pt-4 border-t border-slate-700">
                        <button onClick={() => { if(window.confirm('Are you sure you want to delete this group? All data will be lost.')) onDelete(); }} className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-500">
                            Delete Group
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ExpenseDetailsModal = ({ expense, user, memberProfiles, onClose }) => {
    const isPayer = expense.payerId === user.uid;

    const getUserName = (uid) => {
        if (uid === user.uid) return 'You';
        return memberProfiles[uid]?.displayName || `User ${uid.slice(0,4)}`;
    };

    const handleMarkItemPaid = async (itemIndex) => {
        if (!isPayer) return;
        
        const updatedItems = [...expense.items];
        updatedItems[itemIndex].paid = !updatedItems[itemIndex].paid;

        // Check if all items are now paid
        const allPaid = updatedItems.every(i => i.paid);
        
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', expense.id), {
            items: updatedItems,
            status: allPaid ? 'paid' : 'active'
        });
        
        if (allPaid) onClose(); // Close if fully paid (moves to history)
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md border border-slate-700 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-white">{expense.description}</h3>
                        <p className="text-sm text-slate-400">Paid by {getUserName(expense.payerId)} • ₹{expense.amount.toFixed(2)}</p>
                    </div>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
                </div>

                <div className="space-y-3">
                    {expense.splitType === 'itemized' ? (
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Breakdown</p>
                            {expense.items.map((item, idx) => (
                                <div key={idx} className={`p-3 rounded-lg border flex items-center justify-between ${item.paid ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-slate-900 border-slate-700'}`}>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-white font-medium ${item.paid ? 'line-through text-slate-500' : ''}`}>{item.description}</span>
                                            <span className="text-slate-400 text-sm">(${parseFloat(item.amount).toFixed(2)})</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {item.assignedTo.map(uid => (
                                                <span key={uid} className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                                    {getUserName(uid)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    {isPayer && (
                                        <button 
                                            onClick={() => handleMarkItemPaid(idx)}
                                            className={`p-2 rounded-full transition-colors ${item.paid ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-emerald-600 hover:text-white'}`}
                                            title={item.paid ? "Mark Unpaid" : "Mark Paid"}
                                        >
                                            <Check size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Split Breakdown</p>
                            {expense.splitAmong.filter(id => id !== expense.payerId).map(uid => (
                                <div key={uid} className="flex justify-between items-center p-2 border-b border-slate-700/50">
                                    <span className="text-slate-300">{getUserName(uid)} owes</span>
                                    <span className="font-mono text-white">₹{(expense.amount / expense.splitAmong.length).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const GroupCard = ({ group, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-slate-800 p-5 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-all text-left w-full group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
      <Users size={64} />
    </div>
    <div className="flex justify-between items-start mb-2 relative z-10">
      <div className="bg-slate-700/50 p-2 rounded-lg group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-colors text-slate-300">
        <Users size={20} />
      </div>
      <span className="text-xs font-mono text-slate-500">{group.members.length} members</span>
    </div>
    <h3 className="text-lg font-semibold text-white mb-1 relative z-10">{group.name}</h3>
    <p className="text-slate-400 text-sm line-clamp-1 relative z-10">{group.description || 'No description'}</p>
  </button>
);

const CreateGroupModal = ({ onClose, userId }) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'groups'), {
        name,
        description: desc,
        createdBy: userId,
        members: [userId],
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-700 animate-in fade-in zoom-in duration-200">
        <h3 className="text-xl font-bold text-white mb-4">Create New Group</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            autoFocus
            type="text"
            placeholder="Group Name (e.g. Trip to Cabo)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-lg font-medium">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg font-medium">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddMemberModal = ({ group, onClose }) => {
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!emailInput.trim()) {
        setError('Please enter an email address.');
        setLoading(false);
        return;
    }

    try {
        const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
        const q = query(usersRef, where('email', '==', emailInput.toLowerCase()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            setError('User not found. They must sign up for FairShare first.');
            setLoading(false);
            return;
        }

        const userToAdd = snapshot.docs[0].data();

        if (group.members.includes(userToAdd.uid)) {
            setError('User is already in this group.');
            setLoading(false);
            return;
        }

        const groupRef = doc(db, 'artifacts', appId, 'public', 'data', 'groups', group.id);
        await updateDoc(groupRef, {
            members: arrayUnion(userToAdd.uid)
        });

        setSuccess(`Successfully added ${userToAdd.displayName || 'user'}!`);
        setEmailInput('');
        setTimeout(onClose, 1500);

    } catch (err) {
        console.error("Error adding user:", err);
        setError('Failed to add user. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-700 animate-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Add Member</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={24} /></button>
        </div>
        
        <p className="text-slate-400 text-sm mb-6">Enter the email address of the person you want to invite. They must have an account.</p>

        {error && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {error}
            </div>
        )}

        {success && (
            <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                <CheckCircle size={16} /> {success}
            </div>
        )}

        <form onSubmit={handleAddUser}>
          <input
            autoFocus
            type="email"
            placeholder="friend@example.com"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none mb-4"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-3 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            {loading ? 'Adding...' : <><Plus size={18} /> Add to Group</>}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Main App Logic ---

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
          setLoading(false);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
          if (u.email) {
            try {
                const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid);
                await setDoc(userRef, {
                    uid: u.uid,
                    email: u.email.toLowerCase(),
                    displayName: u.displayName || 'User',
                    lastSeen: serverTimestamp()
                }, { merge: true });
            } catch (err) {
                console.error("Error syncing profile:", err);
            }
          }
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <AuthScreen setUser={setUser} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('dashboard'); setActiveGroup(null); }}>
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg">
              <Activity className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">FairShare</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { 
                if (view === 'personal') {
                  setView('dashboard');
                } else {
                  setView('personal'); 
                  setActiveGroup(null);
                }
              }}
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${view === 'personal' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              Personal
            </button>
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                <span className="text-sm font-medium text-slate-300 max-w-[100px] truncate">
                  {user.isAnonymous ? 'Guest' : (user.displayName || user.email?.split('@')[0])}
                </span>
                <button onClick={() => setShowSettings(true)} className="p-1 hover:text-blue-400">
                    <Settings size={16} />
                </button>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4">
        {view === 'dashboard' && <Dashboard user={user} onSelectGroup={(g) => { setActiveGroup(g); setView('group'); }} />}
        {view === 'group' && activeGroup && <GroupView user={user} group={activeGroup} onBack={() => { setView('dashboard'); setActiveGroup(null); }} />}
        {view === 'personal' && <PersonalExpenseView user={user} />}
      </main>

      {showSettings && <UserSettingsModal user={user} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

const PersonalExpenseView = ({ user }) => {
    const [expenses, setExpenses] = useState([]);
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'));
        const unsub = onSnapshot(q, (snap) => {
        const all = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(e => e.groupId === 'personal' && e.payerId === user.uid)
            .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
        setExpenses(all);
        });
        return () => unsub();
    }, [user.uid]);

    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    const handleDelete = async (id) => {
        if(window.confirm("Are you sure you want to delete this personal expense?")) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', id));
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center mb-6">
            <div>
            <h2 className="text-3xl font-bold text-white mb-1">Personal Spending</h2>
            <p className="text-slate-400">Track your private expenses</p>
            </div>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all">
                <Plus size={20} /> Add Personal
            </button>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
            <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">Total Personal Spend</p>
            <p className="text-4xl font-bold text-white">₹{totalSpent.toFixed(2)}</p>
        </div>

        <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
            {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <User size={48} className="mb-4 opacity-50" />
                <p>No personal expenses recorded.</p>
            </div>
            ) : (
            <div className="divide-y divide-slate-800">
                {expenses.map(e => (
                <div key={e.id} className="p-4 hover:bg-slate-800/50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-500/10 text-purple-400">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <p className="text-white font-medium">{e.description}</p>
                            <p className="text-xs text-slate-500">{new Date((e.date?.seconds || Date.now()/1000) * 1000).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <p className="font-bold text-white">₹{e.amount.toFixed(2)}</p>
                        <button 
                            onClick={() => handleDelete(e.id)}
                            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-lg transition-all"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                ))}
            </div>
            )}
        </div>
        {showAdd && (
            <AddExpenseModal user={user} group={{ id: 'personal', name: 'Personal Expenses', members: [user.uid] }} onClose={() => setShowAdd(false)} isPersonal={true} />
        )}
        </div>
    );
};

const Dashboard = ({ user, onSelectGroup }) => {
    const [groups, setGroups] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'groups'));
        const unsub = onSnapshot(q, (snapshot) => {
        const myGroups = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(g => g.members && g.members.includes(user.uid));
        setGroups(myGroups);
        });
        return () => unsub();
    }, [user]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
            <h2 className="text-3xl font-bold text-white mb-1">Your Groups</h2>
            <p className="text-slate-400">Manage shared expenses</p>
            </div>
            <button 
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
            <Plus size={20} /> New Group
            </button>
        </div>

        {groups.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
            <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-slate-500" size={32} />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No groups yet</h3>
            <p className="text-slate-500 max-w-xs mx-auto mb-6">Create a group to start tracking shared expenses with friends.</p>
            <button onClick={() => setShowCreate(true)} className="text-blue-400 hover:text-blue-300 font-medium">Create your first group</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(g => (
                <GroupCard key={g.id} group={g} onClick={() => onSelectGroup(g)} />
            ))}
            </div>
        )}

        {showCreate && <CreateGroupModal userId={user.uid} onClose={() => setShowCreate(false)} />}
        </div>
    );
};

// --- Group View Component ---
const GroupView = ({ user, group, onBack }) => {
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [activeTab, setActiveTab] = useState('expenses'); // expenses, balances, history
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [selectedExpense, setSelectedExpense] = useState(null);

  useEffect(() => {
    const qExp = query(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'));
    const unsubExp = onSnapshot(qExp, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.groupId === group.id);
      all.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
      setExpenses(all);
    });

    const qSet = query(collection(db, 'artifacts', appId, 'public', 'data', 'settlements'));
    const unsubSet = onSnapshot(qSet, (snap) => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.groupId === group.id);
        setSettlements(all);
    });
    
    // Fetch member names
    const fetchMemberProfiles = async () => {
        const profiles = {};
        const memberPromises = group.members.map(async (uid) => {
            if (uid === user.uid) {
                profiles[uid] = { displayName: 'You' };
                return;
            }
            try {
                const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', uid);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                    profiles[uid] = userSnap.data();
                } else {
                    profiles[uid] = { displayName: `User ${uid.slice(0,4)}` };
                }
            } catch (error) {
                console.error("Error fetching member:", error);
                profiles[uid] = { displayName: `User ${uid.slice(0,4)}` };
            }
        });
        await Promise.all(memberPromises);
        setMemberProfiles(profiles);
    };
    fetchMemberProfiles();

    return () => {
      unsubExp();
      unsubSet();
    };
  }, [group.id, group.members, user.uid]);

  const getUserName = (uid) => {
      if (uid === user.uid) return 'You';
      return memberProfiles[uid]?.displayName || `User ${uid.slice(0,4)}`;
  };

  const balances = useMemo(() => {
    const bal = {};
    group.members.forEach(m => bal[m] = 0);

    // Only process ACTIVE expenses for balances
    const activeExpenses = expenses.filter(e => e.status !== 'paid');

    activeExpenses.forEach(e => {
        const payer = e.payerId;
        const totalAmount = parseFloat(e.amount);

        if (e.splitType === 'itemized' && e.items && e.items.length > 0) {
           let payerCredit = 0;
           e.items.forEach(item => {
              if (item.paid) return; // Skip paid items in calculation
              
              const itemAmt = parseFloat(item.amount);
              const perUser = itemAmt / item.assignedTo.length;
              
              item.assignedTo.forEach(uid => {
                 if (!bal[uid]) bal[uid] = 0;
                 bal[uid] -= perUser;
              });
              payerCredit += itemAmt; // Payer gets credit for unpaid items they covered
           });
           
           if (!bal[payer]) bal[payer] = 0;
           bal[payer] += payerCredit;

        } else {
            const splitCount = e.splitAmong.length;
            if (splitCount === 0) return;
            
            const splitAmount = totalAmount / splitCount;

            e.splitAmong.forEach(memberId => {
                if (!bal[memberId]) bal[memberId] = 0;
                bal[memberId] -= splitAmount;
            });

            if (!bal[payer]) bal[payer] = 0;
            bal[payer] += totalAmount;
        }
    });

    settlements.forEach(s => {
        if (s.status === 'confirmed') {
            if (!bal[s.from]) bal[s.from] = 0;
            if (!bal[s.to]) bal[s.to] = 0;
            bal[s.from] += parseFloat(s.amount);
            bal[s.to] -= parseFloat(s.amount);
        }
    });

    return bal;
  }, [expenses, settlements, group.members]);

  const myBalance = balances[user.uid] || 0;

  const handleDeleteGroup = async () => {
      try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'groups', group.id));
          onBack();
      } catch(e) { console.error(e); }
  };

  const handleMarkExpensePaid = async (e, expense) => {
      e.stopPropagation();
      if (window.confirm("Mark this entire expense as Paid? It will move to history.")) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', expense.id), { status: 'paid' });
      }
  };

  const handleClearHistory = async () => {
      if (!window.confirm("Are you sure you want to permanently delete ALL paid expenses? This cannot be undone.")) return;
      
      const paidExpenses = expenses.filter(e => e.status === 'paid');
      const batch = writeBatch(db);
      
      paidExpenses.forEach(e => {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'expenses', e.id);
          batch.delete(ref);
      });

      try {
          await batch.commit();
      } catch (err) {
          console.error("Error clearing history:", err);
          alert("Failed to clear history.");
      }
  };

  const handleDeleteExpense = async (id) => {
      if (window.confirm("Are you sure you want to delete this expense?")) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', id));
      }
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-500">
      <div className="mb-6">
        <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 mb-4 text-sm font-medium">
            <ArrowRight className="rotate-180" size={16} /> Back to Dashboard
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-white">{group.name}</h1>
                    <button onClick={() => setShowGroupSettings(true)} className="text-slate-400 hover:text-white"><Edit2 size={18} /></button>
                </div>
                <div className="flex items-center gap-2 text-slate-400 mt-1">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700">Group ID: {group.id.slice(0,6)}...</span>
                    <span>•</span>
                    <span className={myBalance >= 0 ? "text-emerald-400" : "text-red-400"}>
                        You {myBalance >= 0 ? "need to get" : "owe"} {Math.abs(myBalance).toFixed(2)}
                    </span>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowAddExpense(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-blue-600/20">
                    <Plus size={18} /> Add Expense
                </button>
                <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex">
                    <button onClick={() => setActiveTab('expenses')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'expenses' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Expenses</button>
                    <button onClick={() => setActiveTab('balances')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'balances' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Settle Up</button>
                    <button onClick={() => setActiveTab('history')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>History</button>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
            {/* EXPENSES TAB */}
            {activeTab === 'expenses' && (
                <>
                  {settlements.filter(s => s.to === user.uid && s.status === 'pending').map(s => (
                      <div key={s.id} className="bg-gradient-to-r from-emerald-900/40 to-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400"><DollarSign size={20} /></div>
                              <div>
                                  <p className="text-white font-medium">Payment Received?</p>
                                  <p className="text-sm text-slate-400">{getUserName(s.from)} says they paid you <span className="text-white font-bold">₹{s.amount}</span></p>
                              </div>
                          </div>
                          <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settlements', s.id), { status: 'confirmed' })} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium">Confirm</button>
                      </div>
                  ))}

                  <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden min-h-[400px]">
                      <div className="divide-y divide-slate-800">
                         {expenses.filter(e => e.status !== 'paid').map((item) => {
                             const isPayer = item.payerId === user.uid;
                             return (
                                 <div 
                                    key={item.id} 
                                    onClick={() => setSelectedExpense(item)}
                                    className="p-4 hover:bg-slate-800/50 transition-colors flex items-center justify-between group cursor-pointer"
                                 >
                                     <div className="flex items-center gap-4">
                                         <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-400"><Wallet size={20} /></div>
                                         <div>
                                             <p className="text-white font-medium flex gap-2">
                                                 {item.description}
                                                 {item.splitType === 'itemized' && <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">Itemized</span>}
                                             </p>
                                             <p className="text-xs text-slate-500">
                                                 {isPayer ? 'You paid' : `${getUserName(item.payerId)} paid`} • {new Date((item.date?.seconds || Date.now()/1000) * 1000).toLocaleDateString()}
                                             </p>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-4">
                                         <p className="font-bold text-white">₹{parseFloat(item.amount).toFixed(2)}</p>
                                         {isPayer && (
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={(e) => handleMarkExpensePaid(e, item)}
                                                    className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white p-2 rounded-lg transition-all"
                                                    title="Mark Paid"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteExpense(item.id); }}
                                                    className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                         )}
                                     </div>
                                 </div>
                             );
                         })}
                      </div>
                  </div>
                </>
            )}

            {/* BALANCES TAB */}
            {activeTab === 'balances' && (
                <BalancesView balances={balances} user={user} users={group.members} memberProfiles={memberProfiles} onSettle={(toId, amount) => {
                    addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settlements'), {
                        groupId: group.id, from: user.uid, to: toId, amount: parseFloat(amount), status: 'pending', type: 'settlement', date: serverTimestamp()
                    });
                    setActiveTab('expenses');
                }} />
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white font-medium">History</h3>
                        {expenses.some(e => e.status === 'paid') && (
                            <button 
                                onClick={handleClearHistory}
                                className="text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors border border-red-500/30"
                            >
                                Clear History
                            </button>
                        )}
                    </div>
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden min-h-[400px]">
                        <div className="divide-y divide-slate-800">
                            {expenses.filter(e => e.status === 'paid').length === 0 && <div className="p-8 text-center text-slate-500">No history yet.</div>}
                            {expenses.filter(e => e.status === 'paid').map((item) => (
                                <div key={item.id} className="p-4 flex items-center justify-between opacity-50 hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-700 text-slate-400"><History size={20} /></div>
                                        <div>
                                            <p className="text-slate-300 font-medium line-through">{item.description}</p>
                                            <p className="text-xs text-slate-500">Paid on {new Date().toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-slate-500">₹{parseFloat(item.amount).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <PieChart size={18} className="text-purple-400"/> Your Position
                </h3>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">Total Balance</span>
                    <span className={`font-bold text-xl ${myBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {myBalance >= 0 ? '+' : '-'}₹{Math.abs(myBalance).toFixed(2)}
                    </span>
                </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Members</h3>
                    <button onClick={() => setShowAddMember(true)} className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1">
                        <Plus size={14} /> Add Member
                    </button>
                </div>
                <div className="space-y-3">
                    {group.members.map(mid => (
                        <div key={mid} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300">
                                    {getUserName(mid).slice(0,2).toUpperCase()}
                                </div>
                                <span className="text-sm text-slate-300">{getUserName(mid)}</span>
                            </div>
                            <span className={`text-xs font-mono ${(balances[mid] || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {(balances[mid] || 0) >= 0 ? '+' : ''}{(balances[mid] || 0).toFixed(0)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {showAddExpense && (
          <AddExpenseModal 
            group={group} user={user} memberProfiles={memberProfiles} onClose={() => setShowAddExpense(false)} 
          />
      )}
      {showAddMember && <AddMemberModal group={group} onClose={() => setShowAddMember(false)} />}
      {showGroupSettings && <GroupSettingsModal group={group} onClose={() => setShowGroupSettings(false)} onDelete={handleDeleteGroup} />}
      {selectedExpense && <ExpenseDetailsModal expense={selectedExpense} user={user} memberProfiles={memberProfiles} onClose={() => setSelectedExpense(null)} />}
    </div>
  );
};

// --- Smart Balance & Settlement View ---
const BalancesView = ({ balances, user, onSettle, memberProfiles }) => {
    const optimizedDebts = useMemo(() => simplifyDebts({...balances}), [balances]);
    const getUserName = (uid) => {
      if (uid === user.uid) return 'You';
      return memberProfiles[uid]?.displayName || `User ${uid.slice(0,4)}`;
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Activity className="text-indigo-400" /> Smart Settlement Plan</h3>
                <p className="text-slate-400 text-sm mb-6">We used an algorithm to minimize the number of transactions.</p>

                {optimizedDebts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-slate-800/50 rounded-xl">
                        <CheckCircle className="mx-auto mb-2 text-emerald-500" />
                        <p>All debts are settled!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {optimizedDebts.map((debt, idx) => {
                            const isMe = debt.from === user.uid;
                            const isToMe = debt.to === user.uid;
                            return (
                                <div key={idx} className={`p-4 rounded-xl flex items-center justify-between ${isMe ? 'bg-indigo-600/20 border border-indigo-500/50' : 'bg-slate-800 border border-slate-700 opacity-75'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="text-sm">
                                            <span className={isMe ? 'font-bold text-white' : 'text-slate-300'}>{getUserName(debt.from)}</span>
                                            <span className="text-slate-500 mx-2">owes</span>
                                            <span className={isToMe ? 'font-bold text-white' : 'text-slate-300'}>{getUserName(debt.to)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-white">₹{debt.amount}</span>
                                        {isMe && <button onClick={() => onSettle(debt.to, debt.amount)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded shadow-lg shadow-indigo-600/20">Pay</button>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Add Expense Modal with Enhanced Splits ---
const AddExpenseModal = ({ group, user, memberProfiles = {}, onClose, isPersonal = false }) => {
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [splitType, setSplitType] = useState('equal');
    const [selectedMembers, setSelectedMembers] = useState(group.members);
    const [items, setItems] = useState([{ description: '', amount: '', assignedTo: [], paid: false }]);

    useEffect(() => { if(!isPersonal) setSelectedMembers(group.members); }, [group.members, isPersonal]);

    const getUserName = (uid) => {
        if (uid === user.uid) return 'Me';
        return memberProfiles[uid]?.displayName || `User ${uid.slice(0,4)}`;
    };

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { alert("Voice not supported."); return; }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const numberMatch = transcript.match(/(\d+)(\.\d+)?/);
            if (numberMatch) setAmount(numberMatch[0]);
            let cleanDesc = transcript.replace(/paid/gi, '').replace(/\d+(\.\d+)?/g, '').replace(/dollars?/gi, '').replace(/for/gi, '').trim();
            cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
            setDesc(cleanDesc || transcript);
        };
        recognition.start();
    };

    const handleAddItem = () => setItems([...items, { description: '', amount: '', assignedTo: [], paid: false }]);
    const handleItemChange = (idx, field, val) => { const newItems = [...items]; newItems[idx][field] = val; setItems(newItems); };
    const toggleItemAssignee = (itemIdx, uid) => {
        const newItems = [...items];
        const current = newItems[itemIdx].assignedTo;
        if (current.includes(uid)) newItems[itemIdx].assignedTo = current.filter(id => id !== uid);
        else newItems[itemIdx].assignedTo = [...current, uid];
        setItems(newItems);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || !desc) return;

        const payload = {
            groupId: group.id, payerId: user.uid, amount: parseFloat(amount), description: desc, date: serverTimestamp(), type: 'expense', splitType, status: 'active'
        };

        if (splitType === 'equal') payload.splitAmong = group.members;
        else if (splitType === 'select') payload.splitAmong = selectedMembers;
        else if (splitType === 'itemized') {
            const itemsTotal = items.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);
            if (Math.abs(itemsTotal - parseFloat(amount)) > 0.1) { alert(`Item totals (₹${itemsTotal}) do not match expense total (₹${amount}).`); return; }
            payload.items = items; payload.splitAmong = [];
        }

        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), payload);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-lg border border-slate-700 animate-in zoom-in duration-200 my-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">{isPersonal ? 'Add Personal Expense' : 'Add Group Expense'}</h3>
                    <button onClick={onClose}><X className="text-slate-500 hover:text-white" /></button>
                </div>
                
                <div className="mb-6 flex justify-center">
                    <button onClick={startListening} className={`p-4 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300 hover:bg-blue-600 hover:text-white'}`}>{isListening ? <MicOff /> : <Mic />}</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                        <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white mt-1" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Dinner" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount (₹)</label>
                        <input type="number" step="0.01" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white mt-1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                    </div>

                    {!isPersonal && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Split Method</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button type="button" onClick={() => setSplitType('equal')} className={`p-2 text-sm rounded-lg border ${splitType === 'equal' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-700'}`}>Split Equally</button>
                                <button type="button" onClick={() => setSplitType('select')} className={`p-2 text-sm rounded-lg border ${splitType === 'select' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-700'}`}>Select People</button>
                                <button type="button" onClick={() => setSplitType('itemized')} className={`p-2 text-sm rounded-lg border ${splitType === 'itemized' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-700'}`}>By Item</button>
                            </div>
                        </div>
                    )}

                    {splitType === 'select' && !isPersonal && (
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                             <div className="space-y-2 max-h-40 overflow-y-auto">
                                 {group.members.map(m => (
                                     <div key={m} onClick={() => { if(selectedMembers.includes(m)) setSelectedMembers(selectedMembers.filter(id => id !== m)); else setSelectedMembers([...selectedMembers, m]); }} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 p-1.5 rounded">
                                         <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedMembers.includes(m) ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>{selectedMembers.includes(m) && <CheckSquare size={14} className="text-white" />}</div>
                                         <span className="text-sm text-slate-300">{getUserName(m)}</span>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}

                    {splitType === 'itemized' && !isPersonal && (
                         <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 space-y-3">
                             {items.map((item, idx) => (
                                 <div key={idx} className="bg-slate-800 p-2 rounded border border-slate-700">
                                     <div className="flex gap-2 mb-2">
                                         <input type="text" placeholder="Item name" className="flex-1 bg-slate-900 border border-slate-600 rounded p-1.5 text-xs text-white" value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} />
                                         <input type="number" placeholder="₹" className="w-20 bg-slate-900 border border-slate-600 rounded p-1.5 text-xs text-white" value={item.amount} onChange={e => handleItemChange(idx, 'amount', e.target.value)} />
                                     </div>
                                     <div className="flex flex-wrap gap-1">
                                         {group.members.map(m => (
                                             <button key={m} type="button" onClick={() => toggleItemAssignee(idx, m)} className={`text-[10px] px-2 py-1 rounded border ${item.assignedTo.includes(m) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-600 text-slate-400'}`}>{getUserName(m)}</button>
                                         ))}
                                     </div>
                                 </div>
                             ))}
                             <button type="button" onClick={handleAddItem} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus size={14} /> Add another item</button>
                         </div>
                    )}
                    
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg font-bold mt-4 shadow-lg shadow-blue-600/20">Save Expense</button>
                </form>
            </div>
        </div>
    );
};

export default App;