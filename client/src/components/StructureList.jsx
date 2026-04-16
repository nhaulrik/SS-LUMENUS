/**
 * StructureList — Simple list component for displaying available structures
 *
 * Note: This component is referenced in RelationshipBuilder but may not be
 * directly used if the structure selector is implemented inline.
 * Kept for potential future use or refactoring.
 */

import styles from './StructureList.module.css';

const StructureList = ({ structures, selectedId, onSelect, onDelete }) => {
  if (!structures || structures.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No structures yet</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {structures.map(structure => (
        <div
          key={structure.id}
          className={`${styles.item} ${selectedId === structure.id ? styles.selected : ''}`}
          onClick={() => onSelect(structure)}
        >
          <div className={styles.itemContent}>
            <div className={styles.name}>{structure.name}</div>
            <div className={styles.meta}>
              {structure.nodeCount || 0} slides •{' '}
              {new Date(structure.createdAt).toLocaleDateString()}
            </div>
          </div>
          <button
            className={styles.deleteButton}
            onClick={e => {
              e.stopPropagation();
              onDelete(structure.id);
            }}
            title="Delete structure"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default StructureList;
