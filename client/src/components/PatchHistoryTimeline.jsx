import { useState } from 'react'

/**
 * UC11 - UC14: Patch history timeline.
 * Shows all applied rounds in a chain, allows restore, download, and rename.
 */
export default function PatchHistoryTimeline({ chainId, rounds, currentRoundId, onRestore, onRename }) {
  const [editingId, setEditingId] = useState(null)
  const [editName,  setEditName]  = useState('')

  const validRounds = (rounds || []).filter(r => r != null && r.id != null)
  if (validRounds.length === 0) return null

  const sorted       = [...validRounds].sort((a, b) => new Date(a.appliedAt) - new Date(b.appliedAt))
  const currentIdx   = currentRoundId
    ? sorted.findIndex(r => r.id === currentRoundId)
    : sorted.length - 1

  const commitEdit = (roundId) => {
    if (editName.trim()) onRename(roundId, editName.trim())
    setEditingId(null)
  }

  return (
    <div className="patch-history">
      <div className="patch-history-header">
        <span className="patch-history-title">Patch History</span>
        <span className="patch-history-badge">{rounds.length}</span>
      </div>

      {/* Timeline dot strip */}
      <div className="patch-history-dots">
        {sorted.map((round, idx) => (
          <div key={round.id} className="patch-history-dot-wrap">
            <button
              className={`patch-history-dot ${idx === currentIdx ? 'current' : ''}`}
              title={round.name}
              onClick={() => idx !== currentIdx && onRestore(round.id)}
            />
            {idx < sorted.length - 1 && <div className="patch-history-dot-line" />}
          </div>
        ))}
      </div>

      {/* Round cards — newest first */}
      <div className="patch-history-list">
        {[...sorted].reverse().map((round, reversedIdx) => {
          const originalIdx = sorted.length - 1 - reversedIdx
          const isCurrent   = originalIdx === currentIdx
          const isEditing   = editingId === round.id
          const time        = new Date(round.appliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const tagCount    = round.tags?.length ?? 0
          const propCount   = round.propagations?.length ?? 0

          return (
            <div key={round.id} className={`patch-history-round ${isCurrent ? 'current' : ''}`}>
              <div className="patch-history-round-top">
                {isEditing ? (
                  <input
                    className="patch-history-name-input"
                    value={editName}
                    autoFocus
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => commitEdit(round.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  { e.preventDefault(); commitEdit(round.id) }
                      if (e.key === 'Escape') { setEditingId(null) }
                    }}
                  />
                ) : (
                  <span className="patch-history-name">
                    {round.name}
                    {isCurrent && <span className="patch-history-current-badge">Current</span>}
                  </span>
                )}
                <span className="patch-history-time">{time}</span>
              </div>

              <div className="patch-history-meta">
                {tagCount} tag{tagCount !== 1 ? 's' : ''}
                {propCount > 0 && ` · ${propCount} propagation${propCount !== 1 ? 's' : ''}`}
              </div>

              <div className="patch-history-actions">
                {!isCurrent && (
                  <button
                    className="patch-history-btn"
                    onClick={() => onRestore(round.id)}
                  >
                    Restore
                  </button>
                )}
                <a
                  className="patch-history-btn"
                  href={`/api/patch-chains/${chainId}/download/${round.outputFile}`}
                  download
                  title="Download this version"
                >
                  ↓
                </a>
                <button
                  className="patch-history-btn"
                  title="Rename"
                  onClick={() => { setEditingId(round.id); setEditName(round.name) }}
                >
                  ✎
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
