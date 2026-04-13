import { useState } from 'react'
import SchemaView from './pages/SchemaView.jsx'

const tabs = [
  { id: 'schema', label: 'Схема БД', component: SchemaView }
]

function App() {
  const [activeTab, setActiveTab] = useState('schema')

  const TabContent = tabs.find(t => t.id === activeTab)?.component || SchemaView

  return (
    <div>
      <nav class="bg-slate-900 p-4 shadow-lg">
        <div class="max-w-7xl mx-auto flex space-x-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              class={`px-4 py-2 rounded font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      <main class="min-h-screen bg-slate-900">
        <TabContent />
      </main>
    </div>
  )
}

export default App
