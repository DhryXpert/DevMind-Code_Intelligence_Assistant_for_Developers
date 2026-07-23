import React, { useState } from 'react'
import CodeEditor from './components/CodeEditor'
import SearchBar from './components/SearchBar'
import BugsPanel from './components/BugsPanel'
import ExplainPanel from './components/ExplainPanel'
import TestsPanel from './components/TestsPanel'

function App() {
  const [code, setCode] = useState('# Paste your code here\n')
  const [activeTab, setActiveTab] = useState('explain')

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>DevMind Web IDE Companion</h1>
        <SearchBar />
      </header>
      <main className="app-content">
        <div className="editor-section">
          <CodeEditor value={code} onChange={setCode} />
        </div>
        <div className="panel-section">
          <div className="tabs">
            <button onClick={() => setActiveTab('explain')}>Explain</button>
            <button onClick={() => setActiveTab('bugs')}>Bugs</button>
            <button onClick={() => setActiveTab('tests')}>Tests</button>
          </div>
          <div className="tab-content">
            {activeTab === 'explain' && <ExplainPanel code={code} />}
            {activeTab === 'bugs' && <BugsPanel code={code} />}
            {activeTab === 'tests' && <TestsPanel code={code} />}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
