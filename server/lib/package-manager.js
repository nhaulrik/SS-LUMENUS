/**
 * server/lib/package-manager.js
 *
 * Phase 4C: Packaging System - Package Management
 *
 * Manages package creation, organization, and distribution.
 * Users can create packages from structures with hierarchical file organization,
 * auto-generated manifests and READMEs, and ZIP distribution.
 *
 * Directory structure per chain:
 *   server/chains/<chainId>/packages/
 *     package-1/
 *       package.json        — package metadata
 *       README.md           — auto-generated documentation
 *       MANIFEST.json       — structure and file listing
 *       metadata.json       — statistics and summary
 *       slides/
 *         01-introduction/
 *           slide-1.html
 *           metadata.json
 *         02-content/
 *           slide-2.html
 *           02-01-subsection/
 *             slide-3.html
 *     package-2/
 *       ...
 */

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { CHAINS_DIR, isInsideDir } from '../config.js';
import * as StructureManager from './structure-manager.js';

// ── Security helpers ──────────────────────────────────────────────────────────

/**
 * Validate a chainId and return safe chain directory path, or null.
 */
function resolveChainDir(chainId) {
  if (!chainId || typeof chainId !== 'string') return null;
  if (!/^[\w-]{1,100}$/.test(chainId)) return null;
  const chainDir = path.join(CHAINS_DIR, chainId);
  const resolved = path.resolve(CHAINS_DIR);
  const resolvedChainDir = path.resolve(chainDir);
  if (!resolvedChainDir.startsWith(resolved + path.sep) && resolvedChainDir !== resolved) return null;
  return chainDir;
}

/**
 * Validate a packageId and return safe package directory path, or null.
 */
function resolvePackageDir(chainId, packageId) {
  const chainDir = resolveChainDir(chainId);
  if (!chainDir) return null;
  if (!packageId || typeof packageId !== 'string') return null;
  if (!/^package-\d+$/.test(packageId)) return null;
  const packageDir = path.join(chainDir, 'packages', packageId);
  const resolvedChain = path.resolve(chainDir);
  if (!path.resolve(packageDir).startsWith(resolvedChain + path.sep)) return null;
  return packageDir;
}

// ── Helper functions ──────────────────────────────────────────────────────────

/**
 * Ensure a directory exists.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generate next packageId by finding highest existing ID.
 */
function getNextPackageId(chainId) {
  const chainDir = resolveChainDir(chainId);
  if (!chainDir) return null;
  const packagesDir = path.join(chainDir, 'packages');
  if (!fs.existsSync(packagesDir)) return 'package-1';
  const dirs = fs.readdirSync(packagesDir).filter(d => /^package-\d+$/.test(d));
  if (dirs.length === 0) return 'package-1';
  const ids = dirs.map(d => parseInt(d.replace('package-', '')));
  const maxId = Math.max(...ids);
  return `package-${maxId + 1}`;
}

/**
 * Load package.json from a package directory.
 */
function loadPackageJson(packageDir) {
  const filePath = path.join(packageDir, 'package.json');
  if (!fs.existsSync(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

/**
 * Save package.json to a package directory.
 */
function savePackageJson(packageDir, data) {
  ensureDir(packageDir);
  const filePath = path.join(packageDir, 'package.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Calculate directory size in bytes.
 */
function getDirectorySize(dir) {
  if (!fs.existsSync(dir)) return 0;
  let size = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += stat.size;
    }
  }
  return size;
}

/**
 * Format bytes to human-readable size.
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Count files in a directory recursively.
 */
function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      count += countFiles(filePath);
    } else {
      count += 1;
    }
  }
  return count;
}

/**
 * Calculate tree depth by traversing structure.
 */
function getTreeDepth(nodes, nodeId = null, depth = 0) {
  if (!nodes || nodes.length === 0) return 0;
  
  let maxDepth = depth;
  let nodesToProcess = nodeId ? [nodeId] : nodes.filter(n => !n.parentId).map(n => n.nodeId);
  
  while (nodesToProcess.length > 0) {
    const nextLevel = [];
    for (const currentId of nodesToProcess) {
      const node = nodes.find(n => n.nodeId === currentId);
      if (node && node.children && node.children.length > 0) {
        nextLevel.push(...node.children);
        maxDepth = Math.max(maxDepth, depth + 1);
      }
    }
    nodesToProcess = nextLevel;
    depth += 1;
  }
  
  return maxDepth;
}

// ── Core CRUD Operations ──────────────────────────────────────────────────────

/**
 * Create a new package from a structure.
 * Returns { packageId, ...packageData } or null on error.
 */
export function createPackage(chainId, name, description, structureId, options = {}) {
  if (!chainId || !name || !structureId) return null;
  
  // Validate structure exists
  const structure = StructureManager.getStructure(chainId, structureId);
  if (!structure) return null;
  
  const packageId = getNextPackageId(chainId);
  if (!packageId) return null;
  
  const now = new Date().toISOString();
  const packageData = {
    packageId,
    chainId,
    name,
    description: description || '',
    structureId,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    metadata: {
      title: name,
      author: '',
      version: '1.0',
      tags: []
    },
    options: {
      includeMetadata: options.includeMetadata !== false,
      generateReadme: options.generateReadme !== false,
      includeManifest: options.includeManifest !== false,
      zipFormat: options.zipFormat || 'hierarchical'
    },
    stats: {
      totalSlides: 0,
      totalSize: '0 B',
      treeDepth: 0,
      fileCount: 0
    }
  };
  
  // Save package.json
  const packageDir = resolvePackageDir(chainId, packageId);
  if (!packageDir) return null;
  savePackageJson(packageDir, packageData);
  
  return packageData;
}

/**
 * List all packages for a chain.
 * Returns array of package objects or empty array.
 */
export function listPackages(chainId) {
  const chainDir = resolveChainDir(chainId);
  if (!chainDir) return [];
  
  const packagesDir = path.join(chainDir, 'packages');
  if (!fs.existsSync(packagesDir)) return [];
  
  const packages = [];
  const dirs = fs.readdirSync(packagesDir).filter(d => /^package-\d+$/.test(d));
  
  for (const dir of dirs) {
    const packageDir = path.join(packagesDir, dir);
    const pkg = loadPackageJson(packageDir);
    if (pkg) packages.push(pkg);
  }
  
  return packages;
}

/**
 * Get a specific package by ID.
 * Returns package object or null.
 */
export function getPackage(chainId, packageId) {
  const packageDir = resolvePackageDir(chainId, packageId);
  if (!packageDir) return null;
  
  const pkg = loadPackageJson(packageDir);
  if (!pkg) return null;
  
  return pkg;
}

/**
 * Update package metadata.
 * Returns updated package object or null.
 */
export function updatePackage(chainId, packageId, updates) {
  const pkg = getPackage(chainId, packageId);
  if (!pkg) return null;
  
  const updated = {
    ...pkg,
    ...updates,
    packageId: pkg.packageId, // Don't allow ID change
    chainId: pkg.chainId,     // Don't allow chainId change
    createdAt: pkg.createdAt, // Don't allow creation time change
    updatedAt: new Date().toISOString()
  };
  
  const packageDir = resolvePackageDir(chainId, packageId);
  if (!packageDir) return null;
  
  savePackageJson(packageDir, updated);
  return updated;
}

/**
 * Delete a package.
 * Returns true on success, false on error.
 */
export function deletePackage(chainId, packageId) {
  const packageDir = resolvePackageDir(chainId, packageId);
  if (!packageDir) return false;
  
  if (!fs.existsSync(packageDir)) return false;
  
  try {
    fs.rmSync(packageDir, { recursive: true, force: true });
    return true;
  } catch (err) {
    return false;
  }
}

// ── Package Building ──────────────────────────────────────────────────────────

/**
 * Build package directory structure from structure tree.
 * Organizes slides hierarchically matching the structure.
 * Returns true on success, false on error.
 */
export function buildPackageStructure(chainId, packageId) {
  const pkg = getPackage(chainId, packageId);
  if (!pkg) return false;
  
  const structure = StructureManager.getStructure(chainId, pkg.structureId);
  if (!structure) return false;
  
  const packageDir = resolvePackageDir(chainId, packageId);
  if (!packageDir) return false;
  
  const slidesDir = path.join(packageDir, 'slides');
  if (fs.existsSync(slidesDir)) {
    fs.rmSync(slidesDir, { recursive: true, force: true });
  }
  ensureDir(slidesDir);
  
  // Build hierarchical structure
  const nodes = structure.tree.nodes || [];
  const rootNodes = nodes.filter(n => !n.parentId);
  
  let totalSlides = 0;
  let dirCount = 1;
  
  function processNode(node, parentPath, dirNum) {
    const dirName = `${String(dirNum).padStart(2, '0')}-${node.title.toLowerCase().replace(/\s+/g, '-')}`;
    const nodePath = path.join(parentPath, dirName);
    ensureDir(nodePath);
    
    // Copy slide if it exists
    if (node.slideRef) {
      // For now, create a placeholder. In production, copy actual slide files.
      const slideFile = path.join(nodePath, `slide.html`);
      fs.writeFileSync(slideFile, `<!-- Slide: ${node.title} (${node.slideRef}) -->`);
      totalSlides += 1;
    }
    
    // Create metadata for this node
    const nodeMetadata = {
      nodeId: node.nodeId,
      title: node.title,
      slideRef: node.slideRef || null,
      createdAt: node.createdAt
    };
    const metadataFile = path.join(nodePath, 'metadata.json');
    fs.writeFileSync(metadataFile, JSON.stringify(nodeMetadata, null, 2));
    
    // Process children
    if (node.children && node.children.length > 0) {
      let childNum = 1;
      for (const childId of node.children) {
        const childNode = nodes.find(n => n.nodeId === childId);
        if (childNode) {
          processNode(childNode, nodePath, childNum);
          childNum += 1;
        }
      }
    }
  }
  
  // Process all root nodes
  for (const rootNode of rootNodes) {
    processNode(rootNode, slidesDir, dirCount);
    dirCount += 1;
  }
  
  // Update stats
  const stats = {
    totalSlides,
    totalSize: formatSize(getDirectorySize(slidesDir)),
    treeDepth: getTreeDepth(nodes),
    fileCount: countFiles(slidesDir)
  };
  
  const updated = updatePackage(chainId, packageId, { stats });
  return updated !== null;
}

/**
 * Generate manifest.json for a package.
 * Returns manifest object or null on error.
 */
export function generateManifest(chainId, packageId) {
  const pkg = getPackage(chainId, packageId);
  if (!pkg) return null;
  
  const structure = StructureManager.getStructure(chainId, pkg.structureId);
  if (!structure) return null;
  
  const nodes = structure.tree.nodes || [];
  const rootNodes = nodes.filter(n => !n.parentId);
  
  function buildManifestNode(node) {
    const manifestNode = {
      id: node.nodeId,
      title: node.title,
      slides: node.slideRef ? [node.slideRef] : []
    };
    
    if (node.children && node.children.length > 0) {
      manifestNode.children = [];
      for (const childId of node.children) {
        const childNode = nodes.find(n => n.nodeId === childId);
        if (childNode) {
          manifestNode.children.push(buildManifestNode(childNode));
        }
      }
    }
    
    return manifestNode;
  }
  
  const manifest = {
    packageId: pkg.packageId,
    name: pkg.name,
    version: pkg.metadata.version,
    createdAt: pkg.createdAt,
    structure: {
      rootNodes: rootNodes.map(n => buildManifestNode(n))
    },
    metadata: {
      totalSlides: pkg.stats.totalSlides,
      totalSize: pkg.stats.totalSize,
      depth: pkg.stats.treeDepth
    }
  };
  
  // Save manifest
  const packageDir = resolvePackageDir(chainId, packageId);
  if (!packageDir) return null;
  
  const manifestFile = path.join(packageDir, 'MANIFEST.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  
  return manifest;
}

/**
 * Generate README.md for a package.
 * Returns README content as string or null on error.
 */
export function generateReadme(chainId, packageId, title, description) {
  const pkg = getPackage(chainId, packageId);
  if (!pkg) return null;
  
  const structure = StructureManager.getStructure(chainId, pkg.structureId);
  if (!structure) return null;
  
  const nodes = structure.tree.nodes || [];
  
  function buildToc(node, level = 1) {
    const indent = '  '.repeat(level - 1);
    let toc = `${indent}- ${node.title}`;
    if (node.slideRef) {
      toc += ` (${node.slideRef})`;
    }
    toc += '\n';
    
    if (node.children && node.children.length > 0) {
      for (const childId of node.children) {
        const childNode = nodes.find(n => n.nodeId === childId);
        if (childNode) {
          toc += buildToc(childNode, level + 1);
        }
      }
    }
    
    return toc;
  }
  
  const readme = `# ${title || pkg.name}

${description || pkg.description}

**Package ID**: ${pkg.packageId}  
**Created**: ${new Date(pkg.createdAt).toLocaleDateString()}  
**Version**: ${pkg.metadata.version}  
${pkg.metadata.author ? `**Author**: ${pkg.metadata.author}  ` : ''}

## Table of Contents

${nodes.filter(n => !n.parentId).map(n => buildToc(n)).join('')}

## Package Contents

- **Total Slides**: ${pkg.stats.totalSlides}
- **Total Size**: ${pkg.stats.totalSize}
- **Tree Depth**: ${pkg.stats.treeDepth}
- **Files**: ${pkg.stats.fileCount}

## Structure

This package is organized hierarchically to reflect the presentation structure:

\`\`\`
slides/
├── 01-section-name/
│   ├── slide.html
│   ├── metadata.json
│   └── 01-01-subsection/
│       ├── slide.html
│       └── metadata.json
└── 02-section-name/
    ├── slide.html
    └── metadata.json
\`\`\`

## Files

- **MANIFEST.json** - Complete structure and file listing
- **package.json** - Package metadata
- **README.md** - This file
- **slides/** - Organized slide files and metadata

---

*Generated by SOLON Packaging System*
`;
  
  // Save README
  const packageDir = resolvePackageDir(chainId, packageId);
  if (!packageDir) return null;
  
  const readmeFile = path.join(packageDir, 'README.md');
  fs.writeFileSync(readmeFile, readme);
  
  return readme;
}

// ── File Operations ──────────────────────────────────────────────────────────

/**
 * Get list of files in a package.
 * Returns array of file objects with path and size.
 */
export function getPackageFiles(chainId, packageId) {
  const packageDir = resolvePackageDir(chainId, packageId);
  if (!packageDir) return [];
  
  const files = [];
  
  function walkDir(dir, relPath = '') {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const relFullPath = relPath ? path.join(relPath, entry) : entry;
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath, relFullPath);
      } else {
        files.push({
          path: relFullPath,
          size: stat.size,
          sizeFormatted: formatSize(stat.size),
          modified: stat.mtime.toISOString()
        });
      }
    }
  }
  
  walkDir(packageDir);
  return files;
}

/**
 * Create ZIP file for a package.
 * Returns stream to pipe to response.
 */
export function createPackageZip(chainId, packageId) {
  const packageDir = resolvePackageDir(chainId, packageId);
  if (!packageDir) return null;
  
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  // Add all files from package directory
  archive.directory(packageDir, false);
  
  return archive;
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate a package.
 * Returns { valid: boolean, errors: string[] }.
 */
export function validatePackage(chainId, packageId) {
  const pkg = getPackage(chainId, packageId);
  if (!pkg) return { valid: false, errors: ['Package not found'] };
  
  const errors = [];
  
  // Check required fields
  if (!pkg.name) errors.push('Package name is missing');
  if (!pkg.structureId) errors.push('Structure ID is missing');
  if (!pkg.createdAt) errors.push('Creation date is missing');
  
  // Check structure exists
  const structure = StructureManager.getStructure(chainId, pkg.structureId);
  if (!structure) errors.push('Referenced structure does not exist');
  
  // Check package directory
  const packageDir = resolvePackageDir(chainId, packageId);
  if (!packageDir || !fs.existsSync(packageDir)) {
    errors.push('Package directory does not exist');
  }
  
  // Check required files
  if (pkg.options.includeManifest) {
    const manifestFile = path.join(packageDir, 'MANIFEST.json');
    if (!fs.existsSync(manifestFile)) {
      errors.push('Manifest file is missing');
    }
  }
  
  if (pkg.options.generateReadme) {
    const readmeFile = path.join(packageDir, 'README.md');
    if (!fs.existsSync(readmeFile)) {
      errors.push('README file is missing');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ── Statistics ────────────────────────────────────────────────────────────────

/**
 * Calculate package size in bytes.
 */
export function calculatePackageSize(chainId, packageId) {
  const packageDir = resolvePackageDir(chainId, packageId);
  if (!packageDir) return 0;
  
  return getDirectorySize(packageDir);
}

/**
 * Get comprehensive package statistics.
 * Returns stats object or null.
 */
export function getPackageStats(chainId, packageId) {
  const pkg = getPackage(chainId, packageId);
  if (!pkg) return null;
  
  const packageDir = resolvePackageDir(chainId, packageId);
  if (!packageDir) return null;
  
  const sizeBytes = getDirectorySize(packageDir);
  const fileCount = countFiles(packageDir);
  
  return {
    packageId: pkg.packageId,
    name: pkg.name,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
    status: pkg.status,
    sizeBytes,
    sizeFormatted: formatSize(sizeBytes),
    fileCount,
    totalSlides: pkg.stats.totalSlides,
    treeDepth: pkg.stats.treeDepth,
    structure: {
      name: StructureManager.getStructure(chainId, pkg.structureId)?.name || 'Unknown'
    }
  };
}
