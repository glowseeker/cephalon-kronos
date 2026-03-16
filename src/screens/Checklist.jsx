import { useState, useEffect } from 'react'
import { Check, Circle, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { PageLayout, Card, Button} from '../components/UI'

export default function Checklist() {
  const [completed, setCompleted] = useState({})
  const [showHiddenDaily, setShowHiddenDaily] = useState(false)
  const [showHiddenWeekly, setShowHiddenWeekly] = useState(false)
  const [hiddenMap, setHiddenMap] = useState({})

  const isHidden = (task) => hiddenMap[task.id] ?? task.hidden

  const toggleHidden = (taskId) => {
    setHiddenMap(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const tasks = [
    // Daily Resets
    { id: 'sortie', label: 'Sortie', reset: 'daily', hidden: false },
    { id: 'foundry', label: 'Check Foundry', reset: 'daily', hidden: false },
    { id: 'syndicates', label: 'Syndicate Shop', reset: 'daily', hidden: false },
    { id: 'focus', label: 'Focus Cap', reset: 'daily', hidden: false },
    { id: 'simaris', label: 'Simaris Standing', reset: 'daily', hidden: false },
    { id: 'darvo', label: 'Darvo Deals', reset: 'daily', hidden: false },
    { id: 'cavia', label: 'Cavia Standing', reset: 'daily', hidden: false },
    { id: 'ostron', label: 'Ostron Standing', reset: 'daily', hidden: false },
    { id: 'holdfasts', label: 'Holdfasts Standing', reset: 'daily', hidden: false },
    { id: 'hex', label: 'Hex Standing', reset: 'daily', hidden: false },
    { id: 'necraloid', label: 'Necraloid Standing', reset: 'daily', hidden: false },
    { id: 'vox', label: 'Vox Solaris Standing', reset: 'daily', hidden: false },
    { id: 'ventkids', label: 'Ventkids Standing', reset: 'daily', hidden: false },
    { id: 'quills', label: 'Quills Standing', reset: 'daily', hidden: false },
    { id: 'little-duck', label: 'Little Duck', reset: 'daily', hidden: false },
    { id: 'solaris', label: 'Solaris United Standing', reset: 'daily', hidden: false },
    { id: 'entrati', label: 'Entrati Family Standing', reset: 'daily', hidden: false },
    { id: 'conclave', label: 'Conclave Standing', reset: 'daily', hidden: false },
    { id: 'acrithisdaily', label: 'Acrithis Daily Rotation', reset: 'daily', hidden: false },
    { id: 'incursions', label: 'Steel Path Incursions', reset: 'daily', hidden: false },
    { id: 'Ticker', label: 'Ticker Crew to hire', reset: 'daily', hidden: false },
    { id: 'Marie', label: 'Marie Shop', reset: 'daily', hidden: false },
    { id: 'grandmother', label: 'Grandmother\'s Tokens', reset: 'daily', hidden: false },
    
    // Weekly Resets
    { id: 'clem', label: 'Clem\'s Weekly', reset: 'weekly', hidden: false },
    { id: 'archon', label: 'Archon Hunt', reset: 'weekly', hidden: false },
    { id: 'maroo', label: 'Maroo\'s Ayatan Hunt', reset: 'weekly', hidden: false },
    { id: 'nightwave', label: 'Nightwave Missions and Shop', reset: 'weekly', hidden: false },
    { id: 'palladino', label: 'Palladino', reset: 'weekly', hidden: false },
    { id: 'narmer', label: 'Break Narmer', reset: 'weekly', hidden: false },
    { id: 'circuitnormal', label: 'The Circuit', reset: 'weekly', hidden: false },
    { id: 'circuitsteel', label: 'The Circuit Steel Path', reset: 'weekly', hidden: false },
    { id: 'pulse', label: 'Netracells, EDA or ETA', reset: 'weekly', hidden: false },
    { id: 'calendar', label: '1999 Calendar', reset: 'weekly', hidden: false },
    { id: 'invigoration', label: 'Helminth Invigoration', reset: 'weekly', hidden: false },
    { id: 'descendianormal', label: 'Descendia Normal', reset: 'weekly', hidden: false },
    { id: 'descendiasteel', label: 'Descendia Steel Path', reset: 'weekly', hidden: false },
    { id: 'yonta', label: 'Archimedian Yonta', reset: 'weekly', hidden: false },
    { id: 'acrithisweekly', label: 'Acrithis Weekly Rotation', reset: 'weekly', hidden: false },
    { id: 'teshin', label: 'Teshin Steel Essence Shop', reset: 'weekly', hidden: false },
    { id: 'bird3', label: 'Weekly Shop', reset: 'weekly', hidden: false },
    { id: 'nightcap', label: 'Nightcap', reset: 'weekly', hidden: false },
  ]

  useEffect(() => {
    setHiddenMap(Object.fromEntries(tasks.map(t => [t.id, t.hidden])))
  }, [])

  const toggleTask = (taskId) => {
    setCompleted(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }))
  }

  const resetDaily = () => {
    const newCompleted = { ...completed }
    tasks
      .filter(t => t.reset === 'daily')
      .forEach(t => delete newCompleted[t.id])
    setCompleted(newCompleted)
  }

  const resetWeekly = () => {
    const newCompleted = { ...completed }
    tasks
      .filter(t => t.reset === 'weekly')
      .forEach(t => delete newCompleted[t.id])
    setCompleted(newCompleted)
  }

  const dailyCount = tasks.filter(t => t.reset === 'daily' && !isHidden(t)).length
  const dailyCompleted = tasks.filter(t => t.reset === 'daily' && !isHidden(t) && completed[t.id]).length

  const weeklyCount = tasks.filter(t => t.reset === 'weekly' && !isHidden(t)).length
  const weeklyCompleted = tasks.filter(t => t.reset === 'weekly' && !isHidden(t) && completed[t.id]).length

  return (
    <PageLayout title="Checklist" subtitle="Track daily and weekly activities">
      <div className="space-y-6">
        {/* Progress Overview */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="text-center">
            <p className="text-sm text-kronos-dim mb-1">Daily Progress</p>
            <p className="text-2xl font-bold text-kronos-accent">
              {dailyCompleted}/{dailyCount}
            </p>
          </Card>
          <Card className="text-center">
            <p className="text-sm text-kronos-dim mb-1">Weekly Progress</p>
            <p className="text-2xl font-bold text-kronos-accent">
              {weeklyCompleted}/{weeklyCount}
            </p>
          </Card>
        </div>

        {/* Buttons*/}
        <div className="flex gap-2">
          {/* Reset daily tasks */}
          <Button onClick={resetDaily} variant="secondary" className="flex-1">
            <RotateCcw size={16} className="mr-2" />
            Reset Daily
          </Button>

          {/* Show hidden daily tasks */}
          <Button onClick={() => setShowHiddenDaily(!showHiddenDaily)} variant="secondary" className="flex-1">
            {showHiddenDaily ? (<><EyeOff size={16} className="mr-2" /> Showing hidden</>) : (<><Eye size={16} className="mr-2" /> Showing visible</>)}
          </Button>

          {/* Reset weekly tasks */}
          <Button onClick={resetWeekly} variant="secondary" className="flex-1">
            <RotateCcw size={16} className="mr-2" />
            Reset Weekly
          </Button>

          {/* Show hidden weekly tasks */}
          <Button onClick={() => setShowHiddenWeekly(!showHiddenWeekly)} variant="secondary" className="flex-1">
            {showHiddenWeekly ? (<><EyeOff size={16} className="mr-2" /> Showing hidden</>) : (<><Eye size={16} className="mr-2" /> Showing visible</>)}
          </Button>
        </div>

        {/* Task List - Split into two columns */}
        <div className="grid grid-cols-2 gap-4">
          {/* Daily Tasks */}
          <Card glow className="h-fit">
            <h3 className="text-lg font-semibold mb-3 text-kronos-accent flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                {showHiddenDaily ? "Daily Tasks (hidden)" : "Daily Tasks"}
            </h3>
            <div className="space-y-1">
              {tasks
                .filter(t => t.reset === 'daily')
                .filter(t => showHiddenDaily ? isHidden(t) : !isHidden(t))
                .map(task => (
                <div
                  key={task.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-kronos-panel/40 transition-colors group"
                >
                  <button type="button" onClick={() => toggleTask(task.id)} className="flex items-center gap-3 flex-1 text-left">
                    <div className="flex-shrink-0">
                      {completed[task.id] ? (
                        <Check className="text-kronos-accent" size={20} />
                      ) : (
                        <Circle className="text-kronos-dim group-hover:text-kronos-accent/50" size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <span className={completed[task.id] ? 'line-through text-kronos-dim' : ''}>
                        {task.label}
                      </span>
                    </div>
                  </button>

                  <div className="flex-shrink-0 relative group/tooltip">
                    <button type="button" onClick={() => toggleHidden(task.id)} className="flex-shrink-0 p-1 rounded hover:bg-kronos-panel/30">
                      {isHidden(task) ? (
                        <Eye size={16} />
                      ) : (
                        <EyeOff size={16} />
                      )}
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-kronos-panel rounded text-xs whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                      {isHidden(task) ? 'Show this task' : 'Hide this task'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Weekly Tasks */}
          <Card glow className="h-fit">
            <h3 className="text-lg font-semibold mb-3 text-kronos-accent flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                {showHiddenWeekly ? "Weekly Tasks (hidden)" : "Weekly Tasks"}
            </h3>
            <div className="space-y-1">
              {tasks
                .filter(t => t.reset === 'weekly')
                .filter(t => showHiddenWeekly ? isHidden(t) : !isHidden(t))
                .map(task => (
                <div
                  key={task.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-kronos-panel/40 transition-colors group"
                >
                  <button type="button" onClick={() => toggleTask(task.id)} className="flex items-center gap-3 flex-1 text-left">
                    <div className="flex-shrink-0">
                      {completed[task.id] ? (
                        <Check className="text-kronos-accent" size={20} />
                      ) : (
                        <Circle className="text-kronos-dim group-hover:text-kronos-accent/50" size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <span className={completed[task.id] ? 'line-through text-kronos-dim' : ''}>
                        {task.label}
                      </span>
                    </div>
                  </button>

                  <div className="flex-shrink-0 relative group/tooltip">
                    <button type="button" onClick={() => toggleHidden(task.id)} className="flex-shrink-0 p-1 rounded hover:bg-kronos-panel/30">
                      {isHidden(task) ? (
                        <Eye size={16} />
                      ) : (
                        <EyeOff size={16} />
                      )}
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-kronos-panel rounded text-xs whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                      {isHidden(task) ? 'Show this task' : 'Hide this task'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}