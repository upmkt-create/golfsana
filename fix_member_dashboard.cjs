const fs = require('fs');
let content = fs.readFileSync('src/components/MemberDashboard.tsx', 'utf8');

// 1. Add Plus icon to imports
content = content.replace(
  /ChevronRight,\n} from/g,
  'ChevronRight,\n  Plus\n} from'
);

content = content.replace(
  /from "\.\.\/types";/g,
  `from "../types";\nimport { DEPARTMENTS } from "../data";`
);

// 2. Add onAddTask to props
content = content.replace(
  /onClose: \(\) => void;\n  onUpdateTaskStatus\?: \(taskId: string, newStatus: TaskStatus\) => Promise<void>;\n}/g,
  `onClose: () => void;\n  onUpdateTaskStatus?: (taskId: string, newStatus: TaskStatus) => Promise<void>;\n  onAddTask?: (title: string, projectId: string, assigneeIds: string[], priority: TaskPriority, departmentId?: string) => Promise<void>;\n}`
);

content = content.replace(
  /onUpdateTaskStatus\n}: MemberDashboardProps\)/g,
  `onUpdateTaskStatus,\n  onAddTask\n}: MemberDashboardProps)`
);

// 3. Add form states inside the component
content = content.replace(
  /const \[activeTab, setActiveTab\] = useState<\"tasques\" \| \"projectes\" \| \"cronograma\">\(\"tasques\"\);/g,
  `const [activeTab, setActiveTab] = useState<"tasques" | "projectes" | "cronograma">("tasques");\n\n  const [showAddForm, setShowAddForm] = useState(false);\n  const [newTitle, setNewTitle] = useState("");\n  const [newPriority, setNewPriority] = useState<any>("medium");\n  const [newProjId, setNewProjId] = useState("");\n  const [newDepartmentId, setNewDepartmentId] = useState("dep-reserves");`
);

// 4. Create the handleCreate function
const handleCreateFn = `
  const handleCreateTask = async (e: any) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    // We expect a valid project ID, if not, we try to grab the first active or workspace project 
    const finalProjId = newProjId || (projects.length > 0 ? projects[0].id : "project-1"); 
    
    if (onAddTask) {
      await onAddTask(newTitle, finalProjId, [memberId], newPriority, newDepartmentId);
    }
    
    setNewTitle("");
    setShowAddForm(false);
  };
`;

content = content.replace(
  /const memberTasks = tasks.filter\(t => t.assigneeId === memberId\);/g,
  handleCreateFn + '\n  const memberTasks = tasks.filter(t => t.assigneeId === memberId);'
);

// 5. Render the add task UI right before the Kanban grid
const addTaskUI = `
          {/* Afegir Tasca Section */}
          {onAddTask && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Tauler de Tasques</h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-[#022e5f] hover:bg-[#033b7a] text-white font-bold text-xs py-1.5 px-4 rounded-none flex items-center gap-1.5 transition-all shadow-sm focus:outline-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddForm ? "Tancar" : "Nova Tasca"}</span>
                </button>
              </div>

              {showAddForm && (
                <div className="bg-slate-50 border border-slate-200 p-4 mb-4 shadow-sm text-left">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Crear tasca per a {member.name}</span>
                  </h4>
                  <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Títol de la tasca</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex. Disseny de baner promocional..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 rounded-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Departament</label>
                      <select
                        value={newDepartmentId}
                        onChange={(e) => setNewDepartmentId(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none text-xs text-slate-700 rounded-none"
                      >
                        {DEPARTMENTS.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prioritat</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as any)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none text-xs text-slate-700 rounded-none"
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Mitjana</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Projecte Destí</label>
                      <select
                        value={newProjId}
                        onChange={(e) => setNewProjId(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:outline-none text-xs text-slate-700 rounded-none"
                      >
                        <option value="">Selecciona un projecte</option>
                        {projects.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end justify-end lg:col-span-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewTitle("");
                        }}
                        className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100 rounded-none transition-colors"
                      >
                        Cancel·lar
                      </button>
                      <button
                        type="submit"
                        disabled={!newTitle.trim()}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-none shadow-sm disabled:opacity-50 transition-colors"
                      >
                        Crear Tasca
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
`;

content = content.replace(
  /<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">/g,
  addTaskUI + '\n          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">'
);

fs.writeFileSync('src/components/MemberDashboard.tsx', content);
