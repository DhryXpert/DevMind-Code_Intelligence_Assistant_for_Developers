import React from 'react'

function CodeEditor({ value, onChange }) {
  return (
    <div className="code-editor-placeholder">
      <h3>Code Editor</h3>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={15}
        style={{ width: '100%', fontFamily: 'monospace' }}
      />
    </div>
  )
}

export default CodeEditor
