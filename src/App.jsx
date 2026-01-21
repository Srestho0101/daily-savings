import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Target, ArrowRight, Plus, Calendar, Trophy, Flame, ChevronRight, Camera, Coins, Moon, Sun, Trash2, Undo2, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SavingsTracker() {
  const [goals, setGoals] = useState([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddSaving, setShowAddSaving] = useState(false);
  const [showBorrow, setShowBorrow] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [streak, setStreak] = useState(0);
  const [lastSaveDate, setLastSaveDate] = useState(null);
  const [celebration, setCelebration] = useState(false);
  const [weeklyData, setWeeklyData] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [buttonPress, setButtonPress] = useState(null);

  // New goal form
  const [newGoal, setNewGoal] = useState({
    name: '',
    target: '',
    image: null
  });

  // Add saving form
  const [savingAmount, setSavingAmount] = useState('');

  // Borrow form
  const [borrowAmount, setBorrowAmount] = useState('');
  const [borrowNote, setBorrowNote] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    updateWeeklyChart();
  }, [goals]);

  const loadData = async () => {
    try {
      const goalsData = await window.storage.get('savings_goals');
      const streakData = await window.storage.get('savings_streak');
      const lastDate = await window.storage.get('last_save_date');
      const darkModeData = await window.storage.get('dark_mode');

      if (goalsData) setGoals(JSON.parse(goalsData.value));
      if (streakData) setStreak(parseInt(streakData.value));
      if (lastDate) setLastSaveDate(lastDate.value);
      if (darkModeData) setDarkMode(darkModeData.value === 'true');
    } catch (error) {
      console.log('No saved data yet');
    }
  };

  const saveData = async (updatedGoals) => {
    await window.storage.set('savings_goals', JSON.stringify(updatedGoals));
  };

  const toggleDarkMode = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    await window.storage.set('dark_mode', newMode.toString());
  };

  const updateStreak = async () => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastSaveDate === today) return;

    let newStreak = streak;
    if (lastSaveDate === yesterday || lastSaveDate === null) {
      newStreak = streak + 1;
    } else {
      newStreak = 1;
    }

    setStreak(newStreak);
    setLastSaveDate(today);
    await window.storage.set('savings_streak', newStreak.toString());
    await window.storage.set('last_save_date', today);
  };

  const updateWeeklyChart = () => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      
      let dayTotal = 0;
      goals.forEach(goal => {
        if (goal.savings) {
          goal.savings.forEach(save => {
            if (new Date(save.date).toDateString() === dateStr) {
              dayTotal += save.amount;
            }
          });
        }
      });

      last7Days.push({
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        amount: dayTotal
      });
    }

    setWeeklyData(last7Days);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewGoal({ ...newGoal, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const addGoal = async () => {
    if (!newGoal.name || !newGoal.target) return;

    const goal = {
      id: Date.now(),
      name: newGoal.name,
      target: parseFloat(newGoal.target),
      current: 0,
      image: newGoal.image,
      savings: [],
      borrows: [],
      createdAt: new Date().toISOString()
    };

    const updatedGoals = [...goals, goal];
    setGoals(updatedGoals);
    await saveData(updatedGoals);
    
    setNewGoal({ name: '', target: '', image: null });
    setShowAddGoal(false);
  };

  const deleteGoal = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    const updatedGoals = goals.filter(g => g.id !== goalId);
    setGoals(updatedGoals);
    await saveData(updatedGoals);
  };

  const addSaving = async () => {
    if (!savingAmount || !selectedGoal) return;

    const amount = parseFloat(savingAmount);
    const updatedGoals = goals.map(g => {
      if (g.id === selectedGoal.id) {
        return {
          ...g,
          current: g.current + amount,
          savings: [...(g.savings || []), {
            id: Date.now(),
            amount,
            date: new Date().toISOString()
          }]
        };
      }
      return g;
    });

    // Store for undo
    setLastAction({
      type: 'saving',
      goalId: selectedGoal.id,
      amount: amount,
      savingId: Date.now()
    });

    setGoals(updatedGoals);
    await saveData(updatedGoals);
    await updateStreak();
    
    // Celebration animation
    setCelebration(true);
    setTimeout(() => setCelebration(false), 2000);

    setSavingAmount('');
    setShowAddSaving(false);
    setSelectedGoal(null);
  };

  const undoLastAction = async () => {
    if (!lastAction) return;

    if (lastAction.type === 'saving') {
      const updatedGoals = goals.map(g => {
        if (g.id === lastAction.goalId) {
          return {
            ...g,
            current: g.current - lastAction.amount,
            savings: g.savings.filter(s => s.id !== lastAction.savingId)
          };
        }
        return g;
      });

      setGoals(updatedGoals);
      await saveData(updatedGoals);
      setLastAction(null);
    } else if (lastAction.type === 'borrow') {
      const updatedGoals = goals.map(g => {
        if (g.id === lastAction.goalId) {
          return {
            ...g,
            current: g.current + lastAction.amount,
            borrows: g.borrows.filter(b => b.id !== lastAction.borrowId)
          };
        }
        return g;
      });

      setGoals(updatedGoals);
      await saveData(updatedGoals);
      setLastAction(null);
    }
  };

  const borrowMoney = async () => {
    if (!borrowAmount || !selectedGoal) return;

    const amount = parseFloat(borrowAmount);
    if (amount > selectedGoal.current) {
      alert("You don't have enough saved!");
      return;
    }

    const borrowId = Date.now();
    const updatedGoals = goals.map(g => {
      if (g.id === selectedGoal.id) {
        return {
          ...g,
          current: g.current - amount,
          borrows: [...(g.borrows || []), {
            id: borrowId,
            amount,
            note: borrowNote,
            date: new Date().toISOString()
          }]
        };
      }
      return g;
    });

    // Store for undo
    setLastAction({
      type: 'borrow',
      goalId: selectedGoal.id,
      amount: amount,
      borrowId: borrowId
    });

    setGoals(updatedGoals);
    await saveData(updatedGoals);
    
    setBorrowAmount('');
    setBorrowNote('');
    setShowBorrow(false);
    setSelectedGoal(null);
  };

  const getProgress = (goal) => {
    return Math.min((goal.current / goal.target) * 100, 100);
  };

  const handleButtonPress = (buttonId) => {
    setButtonPress(buttonId);
    setTimeout(() => setButtonPress(null), 200);
  };

  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50';
  const cardBg = darkMode ? 'bg-gray-800' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-800';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const inputBg = darkMode ? 'bg-gray-700 text-white' : 'bg-white';

  return (
    <div className={`min-h-screen ${bgClass} p-4 pb-20 transition-colors duration-300`}>
      {/* Celebration Overlay */}
      {celebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-ping">
            <Sparkles className="w-32 h-32 text-yellow-400" />
          </div>
          <div className="absolute text-6xl animate-bounce">🎉</div>
        </div>
      )}

      {/* Header */}
      <div className={`${cardBg} rounded-3xl shadow-lg p-6 mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Savings Tracker
            </h1>
            <p className={`${textSecondary} text-sm`}>Your journey to financial freedom</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              onTouchStart={() => handleButtonPress('dark-mode')}
              className={`p-3 rounded-full transition-all ${
                buttonPress === 'dark-mode' ? 'scale-95' : 'scale-100'
              } ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
            <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900 px-4 py-2 rounded-full">
              <Flame className="w-6 h-6 text-orange-500" />
              <span className="text-2xl font-bold text-orange-600">{streak}</span>
            </div>
          </div>
        </div>

        {/* Undo Button */}
        {lastAction && (
          <button
            onClick={undoLastAction}
            onTouchStart={() => handleButtonPress('undo')}
            className={`w-full mb-4 flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-xl font-semibold transition-all ${
              buttonPress === 'undo' ? 'scale-95 shadow-lg' : 'scale-100'
            }`}
          >
            <Undo2 className="w-5 h-5" />
            Undo Last Action
          </button>
        )}

        {/* Weekly Chart */}
        {weeklyData.length > 0 && (
          <div className="mt-4">
            <h3 className={`text-sm font-semibold ${textPrimary} mb-2`}>This Week's Progress</h3>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: darkMode ? '#9ca3af' : '#666' }} />
                <YAxis tick={{ fontSize: 12, fill: darkMode ? '#9ca3af' : '#666' }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: darkMode ? '#1f2937' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    color: darkMode ? '#fff' : '#000'
                  }}
                />
                <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Goals List */}
      <div className="space-y-4 mb-6">
        {goals.map(goal => (
          <div key={goal.id} className={`${cardBg} rounded-3xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow`}>
            {goal.image && (
              <div className="h-48 overflow-hidden relative">
                <img src={goal.image} alt={goal.name} className="w-full h-full object-cover" />
                <button
                  onClick={() => deleteGoal(goal.id)}
                  onTouchStart={() => handleButtonPress(`delete-${goal.id}`)}
                  className={`absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full shadow-lg transition-all ${
                    buttonPress === `delete-${goal.id}` ? 'scale-95' : 'scale-100'
                  }`}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className={`text-xl font-bold ${textPrimary}`}>{goal.name}</h3>
                  <p className={textSecondary}>Target: ৳{goal.target.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-600">৳{goal.current.toFixed(2)}</div>
                  <div className={`text-xs ${textSecondary}`}>{getProgress(goal).toFixed(0)}% saved</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className={`relative h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full overflow-hidden mb-4`}>
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
                  style={{ width: `${getProgress(goal)}%` }}
                >
                  <div className="h-full w-full bg-white opacity-30 animate-pulse"></div>
                </div>
                {getProgress(goal) >= 100 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-yellow-500 animate-bounce" />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedGoal(goal);
                    setShowAddSaving(true);
                  }}
                  onTouchStart={() => handleButtonPress(`save-${goal.id}`)}
                  className={`flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    buttonPress === `save-${goal.id}` ? 'scale-95 shadow-lg' : 'scale-100'
                  }`}
                >
                  <Plus className="w-5 h-5" />
                  Add Savings
                </button>
                <button
                  onClick={() => {
                    setSelectedGoal(goal);
                    setShowBorrow(true);
                  }}
                  onTouchStart={() => handleButtonPress(`borrow-${goal.id}`)}
                  className={`flex-1 ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'} px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    buttonPress === `borrow-${goal.id}` ? 'scale-95 shadow-lg' : 'scale-100'
                  }`}
                >
                  <ArrowRight className="w-5 h-5" />
                  Borrow
                </button>
              </div>

              {/* Delete button if no image */}
              {!goal.image && (
                <button
                  onClick={() => deleteGoal(goal.id)}
                  onTouchStart={() => handleButtonPress(`delete-text-${goal.id}`)}
                  className={`w-full mt-2 bg-red-500 text-white px-4 py-2 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    buttonPress === `delete-text-${goal.id}` ? 'scale-95 shadow-lg' : 'scale-100'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Goal
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Goal Button */}
      {!showAddGoal && (
        <button
          onClick={() => setShowAddGoal(true)}
          onTouchStart={() => handleButtonPress('add-goal-fab')}
          className={`fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-all ${
            buttonPress === 'add-goal-fab' ? 'scale-90' : 'scale-100 hover:scale-110'
          }`}
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-40">
          <div className={`${cardBg} w-full rounded-t-3xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-2xl font-bold ${textPrimary}`}>Create New Goal</h2>
              <button
                onClick={() => {
                  setShowAddGoal(false);
                  setNewGoal({ name: '', target: '', image: null });
                }}
                onTouchStart={() => handleButtonPress('close-goal')}
                className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-all ${
                  buttonPress === 'close-goal' ? 'scale-95' : 'scale-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <input
              type="text"
              placeholder="What are you saving for?"
              value={newGoal.name}
              onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
              className={`w-full border-2 ${borderColor} ${inputBg} rounded-xl px-4 py-3 mb-3 focus:border-purple-500 outline-none`}
            />
            
            <input
              type="number"
              placeholder="Target amount (৳)"
              value={newGoal.target}
              onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
              className={`w-full border-2 ${borderColor} ${inputBg} rounded-xl px-4 py-3 mb-3 focus:border-purple-500 outline-none`}
            />
            
            <label className={`flex items-center justify-center w-full border-2 border-dashed ${borderColor} rounded-xl px-4 py-8 mb-4 cursor-pointer hover:border-purple-500 transition-colors`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {newGoal.image ? (
                <img src={newGoal.image} alt="Preview" className="max-h-32 rounded-lg" />
              ) : (
                <div className="text-center">
                  <Camera className={`w-8 h-8 ${textSecondary} mx-auto mb-2`} />
                  <span className={textSecondary}>Upload goal image</span>
                </div>
              )}
            </label>

            <button
              onClick={addGoal}
              onTouchStart={() => handleButtonPress('create-goal')}
              className={`w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold transition-all ${
                buttonPress === 'create-goal' ? 'scale-95 shadow-lg' : 'scale-100'
              }`}
            >
              Create Goal
            </button>
          </div>
        </div>
      )}

      {/* Add Saving Modal */}
      {showAddSaving && selectedGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-40">
          <div className={`${cardBg} w-full rounded-t-3xl p-6`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-2xl font-bold ${textPrimary}`}>Add Savings</h2>
              <button
                onClick={() => {
                  setShowAddSaving(false);
                  setSavingAmount('');
                  setSelectedGoal(null);
                }}
                onTouchStart={() => handleButtonPress('close-saving')}
                className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-all ${
                  buttonPress === 'close-saving' ? 'scale-95' : 'scale-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className={`${textSecondary} mb-4`}>to {selectedGoal.name}</p>
            
            <input
              type="number"
              placeholder="Amount (৳)"
              value={savingAmount}
              onChange={(e) => setSavingAmount(e.target.value)}
              className={`w-full border-2 ${borderColor} ${inputBg} rounded-xl px-4 py-3 mb-4 focus:border-purple-500 outline-none text-2xl font-bold text-center`}
            />

            <button
              onClick={addSaving}
              onTouchStart={() => handleButtonPress('confirm-saving')}
              className={`w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                buttonPress === 'confirm-saving' ? 'scale-95 shadow-lg' : 'scale-100'
              }`}
            >
              <Coins className="w-5 h-5" />
              Save Money
            </button>
          </div>
        </div>
      )}

      {/* Borrow Modal */}
      {showBorrow && selectedGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-40">
          <div className={`${cardBg} w-full rounded-t-3xl p-6`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-2xl font-bold ${textPrimary}`}>Borrow from Savings</h2>
              <button
                onClick={() => {
                  setShowBorrow(false);
                  setBorrowAmount('');
                  setBorrowNote('');
                  setSelectedGoal(null);
                }}
                onTouchStart={() => handleButtonPress('close-borrow')}
                className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-all ${
                  buttonPress === 'close-borrow' ? 'scale-95' : 'scale-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className={`${textSecondary} mb-4`}>from {selectedGoal.name} (৳{selectedGoal.current.toFixed(2)} available)</p>
            
            <input
              type="number"
              placeholder="Amount to borrow (৳)"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
              className={`w-full border-2 ${borderColor} ${inputBg} rounded-xl px-4 py-3 mb-3 focus:border-purple-500 outline-none`}
            />
            
            <textarea
              placeholder="What's this for? (optional note)"
              value={borrowNote}
              onChange={(e) => setBorrowNote(e.target.value)}
              className={`w-full border-2 ${borderColor} ${inputBg} rounded-xl px-4 py-3 mb-4 focus:border-purple-500 outline-none resize-none`}
              rows={3}
            />

            <button
              onClick={borrowMoney}
              onTouchStart={() => handleButtonPress('confirm-borrow')}
              className={`w-full bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold transition-all ${
                buttonPress === 'confirm-borrow' ? 'scale-95 shadow-lg' : 'scale-100'
              }`}
            >
              Confirm Borrow
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
